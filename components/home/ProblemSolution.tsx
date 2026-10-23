import { AlertTriangle, Check, FileText, Mail, X } from "@/components/ui/icons";
import { SonarMark } from "@/components/ui/SonarMark";
import { Reveal } from "@/components/home/Reveal";

/* Before and after, side by side: how a contract moves today (a matrix in
   a spreadsheet, a long email thread, nobody sure who has it) against one
   Govern record that already knows the rating, the office and the date.
   Each side opens on a small scene, then lists the same three points, so
   the comparison reads row for row. The "with Govern" side is wider and
   carries the rating ribbon on its top edge. */

const POINTS: { problem: string; fix: string }[] = [
  {
    problem: "Agreements stall on the wrong desk",
    fix: "Each exception goes straight to the office your matrix names",
  },
  {
    problem: "Your standards live in spreadsheets and people's heads",
    fix: "One review matrix rates every clause, the same way every time",
  },
  {
    problem: "Obligations are forgotten after signature",
    fix: "Every date is found, verified by a person and tracked",
  },
];

function TodayScene() {
  return (
    <div className="home-scene home-scene-today" aria-hidden="true">
      <div className="home-scene-sheet">
        <p className="home-scene-file">Review matrix v7 FINAL (2).xlsx</p>
        <span />
        <span />
        <span />
      </div>
      <p className="home-scene-thread">
        <Mail size={14} />
        <span>RE: RE: FW: Research agreement redlines</span>
        <b>23</b>
      </p>
      <p className="home-scene-note">Who has the sponsor agreement?</p>
    </div>
  );
}

function GovernScene() {
  return (
    <div className="home-scene home-scene-govern" aria-hidden="true">
      <div className="home-scene-record">
        <p className="home-scene-record-head">
          <FileText size={16} />
          <span>Sponsored research agreement</span>
          <span className="home-badge home-badge-deviates">2 need attention</span>
        </p>
        <ul>
          <li>
            <span>Publication delay, 135 days</span>
            <span className="home-badge home-badge-unacceptable">Sent to Legal</span>
          </li>
          <li>
            <span>Indemnity, uncapped</span>
            <span className="home-badge home-badge-deviates">Fallback offered</span>
          </li>
          <li>
            <span>Final report due 14 Mar</span>
            <span className="home-badge home-badge-within">Verified</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function ProblemSolution() {
  return (
    <section id="problem" className="home-section home-section-surface" aria-labelledby="problem-title">
      <div className="home-container">
        <Reveal className="home-section-head">
          <h2 id="problem-title" className="home-h2">
            Why contracts stall, and what changes
          </h2>
        </Reveal>

        <div className="home-compare">
          <Reveal className="home-compare-panel home-compare-today">
            <h3 className="home-compare-tag">
              <AlertTriangle size={16} aria-hidden="true" />
              Today
            </h3>
            <TodayScene />
            <ul className="home-compare-list">
              {POINTS.map(({ problem }) => (
                <li key={problem}>
                  <X size={16} aria-hidden="true" />
                  {problem}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="home-compare-panel home-compare-govern" delay={0.08}>
            <h3 className="home-compare-tag">
              <SonarMark size="xs" />
              With Govern
            </h3>
            <GovernScene />
            <ul className="home-compare-list">
              {POINTS.map(({ fix }) => (
                <li key={fix}>
                  <Check size={16} aria-hidden="true" />
                  {fix}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
