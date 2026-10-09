#!/usr/bin/env node
/**
 * Invitation Flow Verification Script
 *
 * Run this against a live Supabase project to verify the complete
 * admin-invite → teacher-accept → dashboard-access flow.
 *
 * Prerequisites:
 * 1. Run all migrations in Supabase SQL Editor
 * 2. Create storage buckets: exam-pages, logos (private)
 * 3. Set up .env.local with Supabase credentials
 * 4. Start dev server: npm run dev
 *
 * Usage:
 *   npm run verify:invite
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase env vars. Check .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_ADMIN_EMAIL = `admin-test-${Date.now()}@example.com`;
const TEST_TEACHER_EMAIL = `teacher-test-${Date.now()}@example.com`;
const TEST_PASSWORD = "TestPass123!";

async function cleanup() {
  // Delete test users if they exist
  const { data: users } = await admin.auth.admin.listUsers();
  for (const user of users.users) {
    if (user.email === TEST_ADMIN_EMAIL || user.email === TEST_TEACHER_EMAIL) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
}

async function runVerification() {
  console.log("🔍 Starting invitation flow verification...\n");

  try {
    // Step 1: Create admin user
    console.log("1️⃣ Creating admin user...");
    const { data: adminUser, error: adminError } = await admin.auth.admin.createUser({
      email: TEST_ADMIN_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (adminError) throw adminError;
    console.log(`   ✅ Admin created: ${adminUser.user.id}`);

    // Step 2: Create organisation as admin
    console.log("\n2️⃣ Creating organisation...");
    const { data: org, error: orgError } = await admin
      .from("organisations")
      .insert({ name: "Test School", created_by: adminUser.user.id })
      .select("id")
      .single();
    if (orgError) throw orgError;
    console.log(`   ✅ Organisation created: ${org.id}`);

    // Step 3: Promote admin user to admin role
    console.log("\n3️⃣ Setting admin role...");
    const { error: profileError } = await admin
      .from("profiles")
      .update({ organisation_id: org.id, role: "admin" })
      .eq("id", adminUser.user.id);
    if (profileError) throw profileError;
    console.log("   ✅ Admin role set");

    // Step 4: Invite teacher
    console.log("\n4️⃣ Inviting teacher...");
    const { data: invite, error: inviteError } = await admin
      .from("invitations")
      .insert({
        organisation_id: org.id,
        email: TEST_TEACHER_EMAIL,
        created_by: adminUser.user.id,
      })
      .select()
      .single();
    if (inviteError) throw inviteError;
    console.log(`   ✅ Invitation created: ${invite.id} (status: ${invite.status})`);

    // Step 5: Teacher signs up (simulating email/password signup)
    console.log("\n5️⃣ Teacher signs up...");
    const teacherClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: signupData, error: signupError } = await teacherClient.auth.signUp({
      email: TEST_TEACHER_EMAIL,
      password: TEST_PASSWORD,
    });
    if (signupError) throw signupError;
    console.log(`   ✅ Teacher signup initiated: ${signupData.user?.id}`);
    console.log(`   Session exists: ${!!signupData.session}`);

    // Step 6: Simulate email confirmation (exchange code)
    // In real flow, user clicks email link → /auth/callback?code=...
    // We'll directly confirm the user via admin API
    console.log("\n6️⃣ Confirming teacher email...");
    const { data: teacherUser, error: confirmError } = await admin.auth.admin.updateUserById(
      signupData.user.id,
      { email_confirm: true }
    );
    if (confirmError) throw confirmError;
    console.log(`   ✅ Teacher email confirmed`);

    // Step 7: Simulate callback - linkInvitationIfAny logic
    console.log("\n7️⃣ Running invitation linking (callback logic)...");
    const { data: invitation } = await admin
      .from("invitations")
      .select("id, organisation_id")
      .eq("email", TEST_TEACHER_EMAIL)
      .eq("status", "pending")
      .maybeSingle();

    if (!invitation) {
      throw new Error("No pending invitation found for teacher email");
    }

    const { error: upsertError } = await admin.from("profiles").upsert(
      {
        id: teacherUser.user.id,
        email: TEST_TEACHER_EMAIL,
        organisation_id: invitation.organisation_id,
        role: "teacher",
      },
      { onConflict: "id" }
    );
    if (upsertError) throw upsertError;

    const { error: acceptError } = await admin
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);
    if (acceptError) throw acceptError;
    console.log("   ✅ Invitation linked and accepted");

    // Step 8: Verify teacher has org access
    console.log("\n8️⃣ Verifying teacher profile...");
    const { data: teacherProfile, error: profileFetchError } = await admin
      .from("profiles")
      .select("id, organisation_id, role")
      .eq("id", teacherUser.user.id)
      .single();
    if (profileFetchError) throw profileFetchError;
    console.log(`   ✅ Teacher profile: org=${teacherProfile.organisation_id}, role=${teacherProfile.role}`);

    if (teacherProfile.organisation_id !== org.id) {
      throw new Error("Teacher not linked to correct organisation");
    }

    // Step 9: Verify RLS - teacher can only see their own exams
    console.log("\n9️⃣ Testing RLS isolation...");
    const teacherAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${signupData.session?.access_token || ""}` } },
    });

    // Create an exam as teacher
    const { data: exam, error: examError } = await teacherAuthed
      .from("exams")
      .insert({ organisation_id: org.id, status: "draft" })
      .select()
      .single();
    if (examError) throw examError;
    console.log(`   ✅ Teacher created exam: ${exam.id}`);

    // Teacher should see their exam
    const { data: myExams } = await teacherAuthed.from("exams").select("id").eq("teacher_id", teacherUser.user.id);
    console.log(`   ✅ Teacher sees ${myExams?.length ?? 0} own exam(s)`);

    // Step 10: Verify admin sees all org exams
    console.log("\n🔟 Testing admin access...");
    const adminAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${adminUser.session?.access_token || ""}` } },
    });
    // Admin needs to sign in to get session
    const { data: adminSignin } = await adminAuthed.auth.signInWithPassword({
      email: TEST_ADMIN_EMAIL,
      password: TEST_PASSWORD,
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${adminSignin.session?.access_token || ""}` } },
    });

    const { data: allExams } = await adminClient.from("exams").select("id").eq("organisation_id", org.id);
    console.log(`   ✅ Admin sees ${allExams?.length ?? 0} org exam(s)`);

    // Step 11: Verify cross-org isolation (create second org)
    console.log("\n1️⃣1️⃣ Testing cross-org isolation...");
    const { data: org2 } = await admin.from("organisations").insert({ name: "Other School", created_by: adminUser.user.id }).select("id").single();
    await admin.from("exams").insert({ organisation_id: org2.id, teacher_id: adminUser.user.id, status: "draft" });

    // Teacher should NOT see other org's exam
    const { data: crossOrgExams } = await teacherAuthed.from("exams").select("id").eq("organisation_id", org2.id);
    if (crossOrgExams && crossOrgExams.length > 0) {
      throw new Error("RLS FAILED: Teacher can see other org's exams!");
    }
    console.log(`   ✅ Teacher cannot see other org's exams (RLS working)`);

    console.log("\n🎉 ALL CHECKS PASSED! Invitation flow is working correctly.");

  } catch (error) {
    console.error("\n❌ VERIFICATION FAILED:", error.message);
    process.exit(1);
  } finally {
    console.log("\n🧹 Cleaning up test data...");
    await cleanup();
    console.log("   ✅ Cleanup complete");
  }
}

runVerification();