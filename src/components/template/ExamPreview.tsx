import {
  bodyFontSize,
  fontStack,
  pagePadding,
  TITLE_BLOCK_FIELD_LABELS,
  type TemplateConfig,
} from "@/lib/template";
import type { PreviewExam, PreviewQuestion } from "./sampleExam";

type ExamPreviewProps = {
  config: TemplateConfig;
  exam: PreviewExam;
};

const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const lowerLetters = "abcdefghijklmnopqrstuvwxyz".split("");

function Header({ config }: { config: TemplateConfig }) {
  const { logo, schoolName } = config;
  const hasLogo = Boolean(logo?.url || logo?.path);
  const alignment = logo?.position ?? "center";

  const alignClass =
    alignment === "center"
      ? "items-center text-center"
      : alignment === "right"
        ? "items-end text-right"
        : "items-start text-left";

  return (
    <header className={`flex flex-col ${alignClass}`}>
      {hasLogo && logo?.url && (
        <img
          src={logo.url}
          alt="School logo"
          style={{ width: logo.width }}
          className="mb-1 object-contain"
        />
      )}
      {schoolName.enabled && (
        <div className="flex flex-col">
          <span className="font-semibold leading-snug">
            {schoolName.name || "Your School Name"}
          </span>
          {schoolName.address && (
            <span
              className="text-neutral-500"
              style={{ fontSize: bodyFontSize(config.typography.fontSize) - 2 }}
            >
              {schoolName.address}
            </span>
          )}
        </div>
      )}
      {config.header.showRule && <div className="mt-2 w-full border-b-2 border-neutral-900" />}
    </header>
  );
}

function TitleBlockRow({
  field,
  value,
}: {
  field: keyof PreviewExam["titleBlock"];
  value: string | undefined;
}) {
  if (!value) return null;

  return (
    <div className="flex border-b border-neutral-300">
      <span className="w-1/3 border-r border-neutral-300 px-2 py-1 text-neutral-600">
        {TITLE_BLOCK_FIELD_LABELS[field as keyof typeof TITLE_BLOCK_FIELD_LABELS]}
      </span>
      <span className="flex-1 px-2 py-1 font-medium">{value}</span>
    </div>
  );
}

function Options({ question }: { question: PreviewQuestion }) {
  if (!question.options?.length) return null;

  return (
    <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
      {question.options.map((option, index) => (
        <li key={option}>
          <span className="font-semibold">{upperLetters[index]})</span> {option}
        </li>
      ))}
    </ul>
  );
}

function QuestionBlock({
  question,
  number,
  style,
}: {
  question: PreviewQuestion;
  number: number;
  style: TemplateConfig["numbering"]["style"];
}) {
  const label =
    style === "subparts" && question.subparts?.length
      ? `${number}a)`
      : `${number}.`;

  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-8 shrink-0 font-semibold">{label}</span>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <p className="leading-snug">{question.text}</p>
          <span className="shrink-0 font-medium text-neutral-700">[{question.marks}]</span>
        </div>
        <Options question={question} />
        {question.subparts?.length && (
          <div className="mt-1 flex flex-col gap-1">
            {question.subparts.map((subpart, index) => (
              <div key={index} className="flex items-start justify-between gap-4">
                <p className="leading-snug">
                  <span className="font-semibold">
                    {style === "numeric"
                      ? `(${lowerLetters[index]})`
                      : `${number}${lowerLetters[index]})`}
                  </span>{" "}
                  {subpart.text}
                </p>
                <span className="shrink-0 font-medium text-neutral-700">[{subpart.marks}]</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InstructionsBlock({ text }: { text: string }) {
  return (
    <div className="py-2 text-sm text-neutral-700 italic border-y border-neutral-300 my-2 px-2">
      {text}
    </div>
  );
}

function SectionBlock({ title, instructions }: { title: string; instructions?: string }) {
  return (
    <div className="my-3">
      <h2 className="text-lg font-bold text-neutral-900 mb-1">{title}</h2>
      {instructions && (
        <p className="text-sm text-neutral-600 italic">{instructions}</p>
      )}
      <div className="mt-1 w-full border-b-2 border-neutral-900" />
    </div>
  );
}

function PassageBlock({ title, content }: { title?: string; content: string }) {
  return (
    <div className="my-3 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
      {title && <h3 className="font-semibold text-neutral-900 mb-2">{title}</h3>}
      <div className="prose prose-sm text-neutral-700 whitespace-pre-wrap">{content}</div>
    </div>
  );
}

function ExamBody({
  config,
  exam,
}: {
  config: TemplateConfig;
  exam: PreviewExam;
}) {
  const questionNumber = { current: 0 };

  return (
    <div
      className="exam-page relative mx-auto flex w-full max-w-[620px] flex-1 flex-col break-inside-avoid overflow-hidden rounded-md bg-white text-neutral-900 shadow-md"
      style={{
        aspectRatio: "210 / 297",
        ...pagePadding(config),
      }}
    >
      <Header config={config} />
      <div
        className="flex-1 pt-3"
        style={{ fontSize: bodyFontSize(config.typography.fontSize) }}
      >
        <h1 className="text-center text-xl font-bold tracking-tight">
          {exam.heading}
        </h1>

        {config.titleBlock.fields.length > 0 && (
          <div className="mx-auto mt-2 border border-neutral-300 text-sm">
            {config.titleBlock.fields.map((field) => (
              <TitleBlockRow key={field} field={field} value={exam.titleBlock[field]} />
            ))}
          </div>
        )}

        <div className="mt-3 space-y-2">
          {exam.blocks.map((block, blockIndex) => {
            switch (block.type) {
              case "instructions":
                return (
                  <InstructionsBlock key={blockIndex} text={block.text} />
                );
              case "section":
                return (
                  <SectionBlock
                    key={blockIndex}
                    title={block.title}
                    instructions={block.instructions}
                  />
                );
              case "passage":
                return (
                  <PassageBlock
                    key={blockIndex}
                    title={block.title}
                    content={block.content}
                  />
                );
              case "question":
                questionNumber.current += 1;
                return (
                  <QuestionBlock
                    key={blockIndex}
                    question={block.question}
                    number={questionNumber.current}
                    style={config.numbering.style}
                  />
                );
            }
          })}
        </div>
      </div>

      <footer
        className="mt-auto flex items-end justify-between pt-2 text-xs text-neutral-600"
        style={{
          fontSize: bodyFontSize(config.typography.fontSize) - 3,
        }}
      >
        <span className="flex-1">{config.footer.fixedText}</span>
        {config.footer.showPageNumbers && (
          <span className="text-neutral-800">Page 1 of 1</span>
        )}
      </footer>
    </div>
  );
}

export function ExamPreview({ config, exam }: ExamPreviewProps) {
  if (exam.blocks.length === 0) {
    return (
      <div
        className="exam-preview-surface flex flex-col gap-6 rounded-xl bg-[#f4f2ee] p-4 sm:p-6"
        style={{ fontFamily: fontStack(config.typography.fontFamily) }}
      >
        <div className="exam-page relative mx-auto flex w-full max-w-[620px] flex-col rounded-md bg-white p-8 text-center text-neutral-500 shadow-md">
          No content yet. Go back to review and add questions.
        </div>
      </div>
    );
  }

  return (
    <div
      className="exam-preview-surface flex flex-col gap-6 rounded-xl bg-[#f4f2ee] p-4 sm:p-6"
      style={{ fontFamily: fontStack(config.typography.fontFamily) }}
    >
      <ExamBody config={config} exam={exam} />
    </div>
  );
}