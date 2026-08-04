# CALIPAR PWA Demo

A browser-local demonstration of program review and integrated planning for a
college. Everything a visitor creates lives in their own browser and belongs to
them; there is no institution on the other end of it.

## Language

### The workspace

**Workspace**:
The whole body of program-review records held in one visitor's browser. It is
the system of record — nothing is stored anywhere else.
_Avoid_: Database, local storage, snapshot

**Derivation**:
A value computed from the workspace rather than stored in it. A derivation is
always a function of a single consistent reading of the workspace, so two
derived numbers shown together can never disagree.
_Avoid_: Selector, summary, metric, projection

**Working review**:
The review a program lead is presently filling in — the draft they are working
on, or the most recently edited review when no draft exists. New action plans
and resource requests attach to it by default.
_Avoid_: Current review, active review, selected review

### Program review

**Program review**:
A program's periodic self-examination for one academic year, either annual or
comprehensive. Written in six sections.
_Avoid_: Report, assessment, evaluation

**Review section**:
One of the six required parts of a program review: program overview, student
success outcomes, curriculum review, equity analysis, action plans and goals,
and resource needs.
_Avoid_: Chapter, field, part

**Complete**:
Said of a review section that its author has marked complete *and* that has
content. A section marked complete but left empty is not complete, and a review
cannot be submitted until all six are.
_Avoid_: Done, finished, filled in

**Readiness**:
How much of a review is complete, as a count of its complete sections out of
six. A review is submittable at six.
_Avoid_: Progress, completion percentage, score

**Open**:
Said of a record that has not reached a terminal status. A program review is
open while `draft` or `in_review`, and concluded once `validated` or `approved`.
An action plan is open while `not_started` or `ongoing`, and concluded once
`complete` or `institutionalized`.
_Avoid_: Active, in motion, pending, live

**Concluded**:
The opposite of open — the record has reached a terminal status and is no longer
work in hand.
_Avoid_: Closed, finished, archived

### Planning

**Strategic initiative**:
An institution-level goal that program-level work is expected to serve. An
initiative carries its own `active` flag, which says whether the institution is
still pursuing it — this is the one place "active" is a fact about a record
rather than a description of unfinished work.
_Avoid_: Objective, ISMP goal, pillar

**Action plan**:
A commitment a program makes in a review, owned by a person, due on a date, and
mapped to a strategic initiative.
_Avoid_: Task, goal, milestone

**Equity gap**:
A difference in outcomes between a named student group and the overall student
population. An action plan that claims to address one must justify how.
_Avoid_: Disparity, achievement gap, disproportionate impact

### Resources

**Resource request**:
A funded thing a program asks for in a review — money, against an object code
series, at a stated priority, justified by a review finding.
_Avoid_: Ask, budget line, requisition

**Awaiting decision**:
Said of a resource request that has been submitted but not yet funded or
declined: `requested` or `recommended`. Note that `requested` is also one
particular status, narrower than this.
_Avoid_: Pending, outstanding, open

**Decided**:
Said of a resource request that has been `funded` or `declined`.
_Avoid_: Closed, resolved, complete

**Pipeline**:
The resource requests awaiting decision, in priority order. Requests that have
been decided are not in the pipeline.
_Avoid_: Queue, backlog, list

**Total requested**:
The sum of every resource request a program has made this cycle, whatever
became of it. Distinct from the pipeline's value, which counts only what is
still awaiting decision.
_Avoid_: Requested amount, total ask

### Institutional data

**Analytics snapshot**:
One academic year of institutional-research aggregates for one program:
enrollment, completions, course success, equity-group success, and student
learning outcome attainment. A stored record, not a reading of the workspace.
_Avoid_: Metrics, stats, data point

**Rate**:
A proportion of one count to another — course success is successful enrolments
over attempted, SLO attainment is outcomes met over assessed. A rate is always
reported with both of its counts, because the denominator is what makes an
equity claim readable. A rate over an empty denominator does not exist; it is
not zero.
_Avoid_: Percentage, score, ratio, KPI
