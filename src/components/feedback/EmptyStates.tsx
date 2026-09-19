import { EmptyState } from "@/components/ui/EmptyState";

type EmptyExamsProps = {
  onCreateExam: () => void;
};

export function EmptyExams({ onCreateExam }: EmptyExamsProps) {
  return (
    <EmptyState
      title="No exams yet"
      description="Start by capturing handwritten pages and generating your first exam."
      action={{
        label: "Create exam",
        onClick: onCreateExam,
      }}
    />
  );
}

type EmptyTeachersProps = {
  onInvite: () => void;
};

export function EmptyTeachers({ onInvite }: EmptyTeachersProps) {
  return (
    <EmptyState
      title="No teachers invited"
      description="Invite teachers to your organisation so they can start creating exams."
      action={{
        label: "Invite teacher",
        onClick: onInvite,
      }}
    />
  );
}

type EmptyTemplateProps = {
  onConfigure: () => void;
};

export function EmptyTemplate({ onConfigure }: EmptyTemplateProps) {
  return (
    <EmptyState
      title="No template configured"
      description="Set up the official school exam template so all exams look consistent."
      action={{
        label: "Configure template",
        onClick: onConfigure,
      }}
    />
  );
}

type EmptySearchProps = {
  query: string;
  onClear: () => void;
};

export function EmptySearch({ query, onClear }: EmptySearchProps) {
  return (
    <EmptyState
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try a different search term.`}
      action={{
        label: "Clear search",
        onClick: onClear,
      }}
    />
  );
}

type EmptyClassesProps = {
  onAddExam: () => void;
};

export function EmptyClasses({ onAddExam }: EmptyClassesProps) {
  return (
    <EmptyState
      title="No exams by class yet"
      description="When teachers create exams and assign them to classes, they will appear here grouped by class."
      action={{
        label: "Create first exam",
        onClick: onAddExam,
      }}
    />
  );
}
