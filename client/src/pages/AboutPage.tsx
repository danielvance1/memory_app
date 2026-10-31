import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth";
import CodeComponent from "../components/CodeComponent";
import { primaryButton, secondaryButton, textLink } from "../components/ui";

// The About page: what Memodeum is, what a "code" is (with real code tiles as examples), and a
// short step-by-step tutorial at the end. Anyone can open it, logged in or not.

const TUTORIAL_STEPS = [
  {
    title: "Make your codes",
    body: "On the Codes tab, pick a system (1, 2 or 3 digits) and give each group of digits a word or short phrase. 42 could be \"Big Dog\". Pick things you can picture clearly.",
  },
  {
    title: "Choose a route",
    body: "Think of a place you know by heart, like your home, and pick spots along a walk through it: the door, the sofa, the fridge. This is your memory palace.",
  },
  {
    title: "Place your pictures",
    body: "To memorize a number, split it into groups and picture each group's code at the next spot on your route. Walk the route in your head to read the number back.",
  },
  {
    title: "Drill, then test",
    body: "The Drill tab runs 60-second rounds to make your codes automatic, in both directions. Test Memory gives you 5 minutes to memorize a random run of your codes, then you type them back and get scored.",
  },
];

export default function AboutPage() {
  const { user } = useAuth();
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [step, setStep] = useState(0);
  const last = step === TUTORIAL_STEPS.length - 1;

  return (
    <article className="mx-auto w-full max-w-xl pb-4">
      <h2 className="text-2xl">About Memodeum</h2>
      <p className="mt-3 text-fg-dim">
        Memodeum trains you to memorize long strings of digits. Instead of repeating numbers over and over, you turn
        them into pictures and place those pictures along a route you already know, the old memory palace trick.
      </p>

      <h3 className="mt-8 text-lg">What is a code?</h3>
      <div className="mt-4 flex items-start justify-center gap-6">
        <figure className="flex flex-col items-center gap-2 text-center">
          <CodeComponent digits="42" isSet size={96} showLabel={false} tabbable={false} />
          <figcaption className="max-w-[9rem] text-sm text-muted">Set: it has your word</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-2 text-center">
          <CodeComponent digits="07" isSet={false} size={96} showLabel={false} tabbable={false} />
          <figcaption className="max-w-[9rem] text-sm text-muted">Not set yet</figcaption>
        </figure>
      </div>
      <p className="mt-4 text-fg-dim">
        Hey, this is a code. It stands for a small group of digits (one, two or three, your choice) that you pair with
        a word or phrase of your own. Say 42 is "Big Dog": any time you meet 42 in a number, you picture a big dog.
        Green tiles are codes you've set; dark tiles are still waiting for a word.
      </p>
      <p className="mt-3 text-fg-dim">
        Memorizing 428193 then becomes three pictures in a row (42, 81, 93) at three spots on your route, which is far
        easier to hold than six loose digits.
      </p>

      <h3 className="mt-8 text-lg">How you practice</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-fg-dim marker:text-brand">
        <li>
          <span className="font-semibold text-fg">Codes:</span> set your words, and see all your tiles at a glance.
        </li>
        <li>
          <span className="font-semibold text-fg">Drill:</span> 60-second rounds, digits to word or word to digits.
        </li>
        <li>
          <span className="font-semibold text-fg">Test Memory:</span> memorize a random sequence of your codes, then
          recall it in order.
        </li>
      </ul>

      <h3 className="mt-8 text-lg">Tutorial</h3>
      {!tutorialOpen ? (
        <div className="mt-3">
          <p className="mb-4 text-fg-dim">New here? Four quick steps from zero to your first memorized number.</p>
          <button
            type="button"
            className={primaryButton}
            onClick={() => {
              setStep(0);
              setTutorialOpen(true);
            }}
          >
            Start tutorial
          </button>
        </div>
      ) : (
        <section aria-label="Tutorial" className="mt-3 border-2 border-line-strong bg-surface p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Step {step + 1} of {TUTORIAL_STEPS.length}
          </p>
          <h4 className="mt-1 font-display text-base text-brand">{TUTORIAL_STEPS[step].title}</h4>
          <p className="mt-2 min-h-[6rem] text-fg-dim" aria-live="polite">
            {TUTORIAL_STEPS[step].body}
          </p>
          {last && (
            <p className="mt-2 text-fg-dim">
              {user ? (
                <Link to="/codes/edit" className={textLink}>
                  Go set your first code
                </Link>
              ) : (
                <Link to="/signup" className={textLink}>
                  Create an account to start
                </Link>
              )}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button type="button" className={secondaryButton} disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </button>
            <button
              type="button"
              className={primaryButton}
              onClick={() => (last ? setTutorialOpen(false) : setStep(step + 1))}
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </section>
      )}
    </article>
  );
}
