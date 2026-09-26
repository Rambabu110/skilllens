import { useState, useEffect } from "react";

export default function TypewriterHeadline({
  text = "Know the Learner, Build the Competency.",
  splitIndex = 17,
  delay = 400,
  speed = 45,
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let intervalId;
    let charIndex = 0;

    const timeoutId = setTimeout(() => {
      setIsTyping(true);
      intervalId = setInterval(() => {
        setDisplayedText(text.slice(0, charIndex + 1));
        charIndex++;
        if (charIndex >= text.length) {
          clearInterval(intervalId);
          setIsTyping(false);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, delay, speed]);

  return (
    <h1 className="font-urbanist text-[26px] sm:text-[36px] md:text-[64px] font-semibold leading-[1.15] sm:leading-[1.1] tracking-[-1px] sm:tracking-[-1.5px] mb-4 sm:mb-6 select-none">
      <span className="text-white">
        {displayedText.substring(0, splitIndex)}
      </span>
      <span className="text-[#A068FF]">
        {displayedText.substring(splitIndex)}
      </span>
      <span
        className={`inline-block w-[4px] h-[0.9em] bg-[#A068FF] ml-1 align-middle ${
          isTyping ? "animate-pulse" : "animate-bounce"
        }`}
      />
    </h1>
  );
}
