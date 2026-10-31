import SubTabs from "../components/SubTabs";

const tabs = [
  { to: "drill", label: "Drill" },
  { to: "test", label: "Test Memory" },
];

// Everything under /practice: the timed drills and the memory test.
export default function PracticePage() {
  return <SubTabs label="Practice sections" tabs={tabs} />;
}
