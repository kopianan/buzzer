interface Props {
  steps: string[];
  currentStep: number;
}

export function LoadingSteps({ steps, currentStep }: Props) {
  return (
    <section className="text-center py-16">
      <div className="w-12 h-12 border-[3px] border-[#2a2a3a] border-t-[#ff3d5a] rounded-full animate-spin mx-auto mb-5" />
      <ul className="inline-flex flex-col gap-2 text-left">
        {steps.map((stepText, i) => (
          <li
            key={i}
            className={`font-mono text-[13px] flex items-center gap-2 transition-colors duration-300 ${
              i < currentStep
                ? "text-[#00d4aa]"
                : i === currentStep
                ? "text-[#eeeef0]"
                : "text-[#55556a]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                i < currentStep
                  ? "bg-[#00d4aa]"
                  : i === currentStep
                  ? "bg-[#ff3d5a] animate-pulse"
                  : "bg-[#55556a]"
              }`}
            />
            {stepText}
          </li>
        ))}
      </ul>
    </section>
  );
}
