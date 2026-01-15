'use client';

import { useMemo, useState, useEffect, Fragment } from 'react';
import { usePathname } from 'next/navigation';
import { PlusCircle, Filter, CalendarDays } from 'lucide-react';

import { projectLeaderNavigation } from '../navigation';

const inputClassName =
  'w-full rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-200';
const textareaClassName =
  'w-full rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-200';
const tableCellClassName = 'border border-yellow-200 px-3 py-2 align-top';
const tableHeadCellClassName = 'border border-yellow-200 bg-yellow-100 px-3 py-2 text-left font-semibold text-gray-800';
const editableCellProps = { contentEditable: true, suppressContentEditableWarning: true } as const;
const esdGoalCount = 17;
const esdGoalColumns = 3;
const respondentSurveyQuestions = [
  { text: 'Nakataas ang bayranon sa kuryente?' },
  { text: 'Naay estudyante sa panimalay?' },
  { text: 'Nakabalo usab og renewable energy?' },
  { text: 'Nakakita na ug solar panel?' },
  {
    text: 'Nakabaton sa pahibalo o sa pagsabot sa climate change?',
    note: 'With prior explanation to climate change before asking the respondents.',
  },
  { text: 'Gustong makabalo mobuhat sa renewable energy?' },
  { text: 'Gustong mobawas ang bayranon sa kuryente pinaagi sa CEBECO?' },
  {
    text: 'Desididong mosalmot sa pilot testing sa Electricity Decarbonization Program sa komunidad?',
  },
  {
    text: 'Desididong mopadayon sa pilot testing sa Electricity Decarbonization Program sa komunidad?',
  },
  {
    text: 'Uyon sa paghatag og minimal nga gasto aron masuportahan ang Electricity Decarbonization Program sa komunidad?',
  },
];

export default function ProjectLeaderProjectsPage() {
  const pathname = usePathname();
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState('project-summary');

  const activeItem = useMemo(() => {
    return (
      projectLeaderNavigation.find((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)) ?? 
      projectLeaderNavigation.find((item) => item.href === '/project-leader/projects') ?? 
      projectLeaderNavigation[0]
    );
  }, [pathname]);

  const transitionMs = 360;

  const proposalSections = useMemo(
    () => [
      {
        id: 'project-summary',
        label: 'I. Project Summary',
        content: (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Provide a concise overview of the project and the essential administrative details required by the
              extension office.
            </p>
            <div className="space-y-3 text-sm text-gray-900">
              <div className="grid items-start gap-3 md:grid-cols-[240px_16px_1fr]">
                <span className="font-semibold text-gray-900">Title of the project</span>
                <span className="font-semibold text-gray-500">:</span>
                <input className={inputClassName} placeholder="Enter project title" />
              </div>
              <div className="grid items-start gap-3 md:grid-cols-[240px_16px_1fr]">
                <span className="font-semibold text-gray-900">Beneficiaries / Project Locale</span>
                <span className="font-semibold text-gray-500">:</span>
                <input className={inputClassName} placeholder="e.g., Alegria, Tuburan, Cebu" />
              </div>
              <div className="grid items-start gap-3 md:grid-cols-[240px_16px_1fr]">
                <span className="font-semibold text-gray-900">No. of Training Hours</span>
                <span className="font-semibold text-gray-500">:</span>
                <input className={inputClassName} placeholder="e.g., 48 hours" />
              </div>
              <div className="grid items-start gap-3 md:grid-cols-[240px_16px_1fr]">
                <span className="font-semibold text-gray-900">No. of Beneficiaries</span>
                <span className="font-semibold text-gray-500">:</span>
                <input className={inputClassName} placeholder="e.g., 20 homeowners (11 Female / 9 Male)" />
              </div>
              <div className="grid items-start gap-3 md:grid-cols-[240px_16px_1fr]">
                <span className="font-semibold text-gray-900">Total Project Cost</span>
                <span className="font-semibold text-gray-500">:</span>
                <input className={inputClassName} placeholder="e.g., ₱93,500.00" />
              </div>
              <div className="grid items-start gap-3 md:grid-cols-[240px_16px_1fr]">
                <span className="font-semibold text-gray-900">Implementing Curricular Program/s</span>
                <span className="font-semibold text-gray-500">:</span>
                <textarea
                  className={`${textareaClassName} min-h-[72px]`}
                  placeholder="List the curricular programs involved (e.g., BS in Information Technology, Bachelor in Industrial Technology)"
                />
              </div>
              <div className="grid items-start gap-3 md:grid-cols-[240px_16px_1fr]">
                <span className="font-semibold text-gray-900">Implementing Partner/s</span>
                <span className="font-semibold text-gray-500">:</span>
                <textarea
                  className={`${textareaClassName} min-h-[72px]`}
                  placeholder="Name partner organizations (e.g., Mindanao Coalition of Power Consumers, Barangay Council)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span>Extension Agenda</span>
                <span className="text-gray-500">:</span>
              </div>
              <div className="grid gap-px rounded border border-yellow-200 bg-yellow-200 text-sm text-gray-700 sm:grid-cols-5">
                {['1 - LAMESA', '2 - LIMPYU', '3 - LIKOP', '4 - LISTA', '5 - LAMBO', '6 - LAGSIK', '7 - LAMDOG', '8 - LIHOK', '9 - LAMIGIT', '10 - LOKAL'].map(
                  (agenda) => (
                    <label
                      key={agenda}
                      className="flex items-center gap-2 bg-white px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-yellow-300 text-yellow-500 focus:ring-yellow-400"
                      />
                      <span className="whitespace-nowrap">{agenda}</span>
                    </label>
                  ),
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'rationale',
        label: 'II. Rationale of the Project',
        content: (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Provide the compelling justification for the project using the required subsections. Address the need, its
              significance, and the intended solution.
            </p>
            <div className="space-y-6">
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">A. Statement of Need</h4>
                <textarea
                  className={`${textareaClassName} min-h-[200px]`}
                  placeholder="Explain the core problem or unmet need of your target beneficiaries."
                />
              </section>
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">B. Relevance of Need</h4>
                <textarea
                  className={`${textareaClassName} min-h-[180px]`}
                  placeholder="Justify why the institution must respond to this need at this time."
                />
              </section>
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">C. Beneficiary Profile</h4>
                <textarea
                  className={`${textareaClassName} min-h-[180px]`}
                  placeholder="Describe the demographics, socio-economic background, and readiness of the beneficiaries."
                />
              </section>
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">D. Research Basis</h4>
                <textarea
                  className={`${textareaClassName} min-h-[160px]`}
                  placeholder="Summarize the studies, FGDs, or surveys that justify the proposed interventions."
                />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">The table below shows a snapshot of the FGD:</p>
                  <p className="text-sm text-gray-600">Number of respondents – 30</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border border-yellow-200 text-sm text-gray-700">
                      <thead>
                        <tr>
                          <th className={tableHeadCellClassName}>Questions</th>
                          <th className={`${tableHeadCellClassName} text-center`}>Yes</th>
                          <th className={`${tableHeadCellClassName} text-center`}>No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {respondentSurveyQuestions.map((_, index) => (
                          <tr key={`rationale-fgd-row-${index}`}>
                            <td {...editableCellProps} className={tableCellClassName}></td>
                            <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                            <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">E. Proposed Solution</h4>
                <textarea
                  className={`${textareaClassName} min-h-[200px]`}
                  placeholder="Outline the specific interventions you will implement to address the identified need."
                />
              </section>
            </div>
          </div>
        ),
      },
      {
        id: 'goals-objectives',
        label: 'III. Goals, Objectives & Intended Outcomes',
        content: (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Align the project with institutional sustainable development (ISD) goals, articulate project goals, and define
              measurable objectives with intended outcomes.
            </p>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">ESD Goal</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border border-yellow-200 text-sm text-gray-700">
                  <thead>
                    <tr>
                      <th className={`${tableHeadCellClassName} text-center`} colSpan={esdGoalColumns * 2}>
                        Goals/Objectives/Intended Outcomes (follow the required sequence)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.ceil(esdGoalCount / esdGoalColumns) }).map((_, rowIndex) => (
                      <tr key={`esd-goal-row-${rowIndex}`} className="align-top">
                        {Array.from({ length: esdGoalColumns }).map((__, colIndex) => {
                          const goalIndex = rowIndex * esdGoalColumns + colIndex;
                          const withinRange = goalIndex < esdGoalCount;
                          return (
                            <Fragment key={`esd-goal-fragment-${rowIndex}-${colIndex}`}>
                              <td {...editableCellProps} className={tableCellClassName}></td>
                              <td className={`${tableCellClassName} text-center`}>
                                {withinRange ? (
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-yellow-300 text-yellow-500 focus:ring-yellow-400"
                                  />
                                ) : null}
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-2 rounded-lg border border-yellow-200 bg-white p-4 text-sm text-gray-700">
              <h4 className="font-semibold text-gray-900">Intended Outcome</h4>
              <p className="italic text-yellow-800">A sustainable solar energy farm for the homeowners</p>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Project Goals</h4>
                <ol className="mt-2 list-decimal space-y-1 pl-6">
                  <li>There will be increased awareness on renewable energy and climate change.</li>
                  <li>The homeowners will be able to pioneer electricity decarbonization in the municipality.</li>
                  <li>The solar energy farm will become profitable in the long run.</li>
                </ol>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Objectives</h4>
                <ol className="mt-2 list-decimal space-y-1 pl-6">
                  <li>100% of the homeowners will have increased awareness of renewable energy and climate change.</li>
                  <li>100% of the homeowners will have increased knowledge on solar energy harnessing.</li>
                  <li>At least one Memorandum of Agreement will be signed.</li>
                </ol>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'implementation-plan',
        label: 'IV. Implementation Plan',
        content: (
          <div className="space-y-6">
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">A. Extension Delivery Mode</h4>
              <textarea
                className={`${textareaClassName} min-h-[160px]`}
                placeholder="Describe where sessions will be held, delivery formats, learning materials, and support plans for beneficiaries."
              />
            </section>
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">B. Implementation Plan</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] border border-yellow-200 text-sm text-gray-700">
                  <thead>
                    <tr>
                      <th className={tableHeadCellClassName}>Objective</th>
                      <th className={tableHeadCellClassName}>Activities</th>
                      <th className={tableHeadCellClassName}>Person Responsible</th>
                      <th className={`${tableHeadCellClassName} text-center`}>May 2023</th>
                      <th className={`${tableHeadCellClassName} text-center`}>June 2023</th>
                      <th className={`${tableHeadCellClassName} text-center`}>July 2023</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Aug 2023</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Sept 2023</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Oct 2023</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Nov 2023</th>
                      <th className={tableHeadCellClassName}>Status</th>
                      <th className={tableHeadCellClassName}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 9 }).map((_, index) => (
                      <tr key={`implementation-row-${index}`}>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ),
      },
      {
        id: 'monitoring-evaluation',
        label: 'V. Monitoring & Evaluation Plan',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Track objectives against success indicators, baseline data, data-gathering methods, and verification tools. Use
              the table to document frequency, outcomes, and remarks for each objective.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1024px] border border-yellow-200 text-sm text-gray-700">
                <thead>
                  <tr>
                    <th className={tableHeadCellClassName}>Objectives</th>
                    <th className={tableHeadCellClassName}>Success Indicators</th>
                    <th className={tableHeadCellClassName}>Baseline Data</th>
                    <th className={tableHeadCellClassName}>Method of Data Gathering</th>
                    <th className={tableHeadCellClassName}>Frequency</th>
                    <th className={tableHeadCellClassName}>Actual Output / Outcome</th>
                    <th className={tableHeadCellClassName}>Means of Verification</th>
                    <th className={tableHeadCellClassName}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`me-row-${index}`}>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
      {
        id: 'organizational-capability',
        label: 'VI. Organizational Capability',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Present the organization&apos;s capability to deliver the proposed project in paragraph form, addressing the
              guide questions provided in the template.
            </p>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                The College of Technology is composed of technically abled professionals who are skilled and experienced in
                the field. The team is comprised of electrical and electronics engineers as well as practicing electronics,
                drafting, and IT professionals who are able to deliver the required training and achieve the desired results.
                Furthermore, the students taking up BIT-Electrical, BIT-Electronics, and Information Technology will be very
                essential toward the success of the training and the workshops.
              </p>
              <p>
                The project leader, Engr. Naomi A. Buwa, has been an advocate of clean energy and is the primary contact
                person of the Mindanao Coalition of Power Consumers. She is a Professional Electronics Engineer. Engr. Ramon
                Conopio and Engr. Joy Cubillo are both Electrical Engineers, experts in electrical design and currently active
                in the field. Prof. Victor Eboña is a TESDA-accredited expert in consumer electronics and is currently
                involved in sustainable power utilization. Engr. Fernando Sullano is an electronics and IT specialist with
                extensive experience in both wire and wireless technologies, as well as consumer electronics. Dr. James Paul
                Tampao is a master draftsman who is the go-to person for designs as well as technical drawings.
              </p>
              <p>
                At the heart of the team are IT experts who are in charge of the multimedia and creative works needed in the
                delivery of the training and workshops.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'community-extension-team',
        label: 'VII. Community Extension Team',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              List all members of the community extension team and specify their roles and responsibilities.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] border border-yellow-200 text-sm text-gray-700">
                <thead>
                  <tr>
                    <th className={tableHeadCellClassName} rowSpan={2}>
                      Name
                    </th>
                    <th className={`${tableHeadCellClassName} text-center`} colSpan={3}>
                      Gender
                    </th>
                    <th className={tableHeadCellClassName} rowSpan={2}>
                      Role
                    </th>
                    <th className={tableHeadCellClassName} rowSpan={2}>
                      Responsibility
                    </th>
                  </tr>
                  <tr>
                    <th className={`${tableHeadCellClassName} text-center`}>Male</th>
                    <th className={`${tableHeadCellClassName} text-center`}>Female</th>
                    <th className={`${tableHeadCellClassName} text-center`}>
                      All Gender <span className="block text-[11px] font-normal">(Please specify)</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <tr key={`team-row-${index}`}>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td className={`${tableCellClassName} text-center`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-yellow-300 text-yellow-500 focus:ring-yellow-400"
                        />
                      </td>
                      <td className={`${tableCellClassName} text-center`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-yellow-300 text-yellow-500 focus:ring-yellow-400"
                        />
                      </td>
                      <td className={tableCellClassName}>
                        <input
                          className={`${inputClassName} h-8`}
                          placeholder="Specify"
                          type="text"
                        />
                      </td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              Reminders: clearly describe the role of each team member in planning, implementation, monitoring, and
              evaluation. Include student volunteers in the boxes provided.
            </p>
          </div>
        ),
      },
      {
        id: 'sustainability-plan',
        label: 'VIII. Sustainability Plan',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Explain how the project will remain beneficial after funding support and outline the commitment of the
              extension team and beneficiaries.
            </p>
            <ol className="list-decimal space-y-3 pl-6 text-sm text-gray-700">
              <li>Explain how the beneficiaries will continue to benefit beyond the funding period.</li>
              <li>Discuss the team&apos;s willingness to provide continuous technical or mentoring support.</li>
              <li>
                Cite plans for certification, facilitation for employment, or integration into micro-enterprises as
                applicable.
              </li>
            </ol>
            <textarea
              className={textareaClassName}
              rows={6}
              placeholder="Detail the sustainability mechanisms you will implement."
            />
          </div>
        ),
      },
      {
        id: 'budgetary-requirement',
        label: 'IX. Budgetary Requirement',
        content: (
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-semibold text-gray-900">Guidelines in costing the budget:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Do not include “allowances”. Canvass the price of your training materials and supplies.</li>
                <li>Use at least three price quotations.</li>
                <li>
                  Only items necessary for the project should be included. The budget must be addressed by GAA PBS for
                  institutional projects.
                </li>
                <li>Expenses for food, travel, and other logistics must follow allowable cost guidelines.</li>
                <li>
                  Once the council approves your budget, delivery receipts or official receipts must accompany all audited
                  expenses.
                </li>
              </ul>
            </div>
            <div className="space-y-6">
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">A. Training Expenses</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border border-yellow-200 text-sm text-gray-700">
                    <thead>
                      <tr>
                        {['Description', 'Quantity', 'Unit', 'Unit Cost (₱)', 'Total Cost (₱)'].map((heading) => (
                          <th
                            key={`training-heading-${heading}`}
                            className={`${tableHeadCellClassName} ${heading.includes('Cost') ? 'text-right' : heading === 'Quantity' ? 'text-center' : ''}`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <tr key={`training-row-${index}`}>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                        </tr>
                      ))}
                      <tr>
                        <td {...editableCellProps} className={`font-semibold text-gray-900 ${tableCellClassName}`}>Sub-total</td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">B. Office Supplies</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border border-yellow-200 text-sm text-gray-700">
                    <thead>
                      <tr>
                        {['Description', 'Quantity', 'Unit', 'Unit Cost (₱)', 'Total Cost (₱)'].map((heading) => (
                          <th
                            key={`office-heading-${heading}`}
                            className={`${tableHeadCellClassName} ${heading.includes('Cost') ? 'text-right' : heading === 'Quantity' ? 'text-center' : ''}`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <tr key={`office-row-${index}`}>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                        </tr>
                      ))}
                      <tr>
                        <td {...editableCellProps} className={`font-semibold text-gray-900 ${tableCellClassName}`}>Sub-total</td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">C. Other Expenses</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border border-yellow-200 text-sm text-gray-700">
                    <thead>
                      <tr>
                        {['Description', 'Quantity / Unit', 'Unit Cost (₱)', 'Amount (₱)'].map((heading) => (
                          <th
                            key={`other-heading-${heading}`}
                            className={`${tableHeadCellClassName} ${heading.includes('Cost') || heading.includes('Amount') ? 'text-right' : ''}`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <tr key={`other-row-${index}`}>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                        </tr>
                      ))}
                      <tr>
                        <td {...editableCellProps} className={`font-semibold text-gray-900 ${tableCellClassName}`}>Sub-total</td>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Total Budgetary Requirements</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border border-yellow-200 text-sm text-gray-700">
                    <tbody>
                      {['A. Training Expenses', 'B. Office Supplies', 'C. Other Expenses'].map((category) => (
                        <tr key={`budget-summary-${category}`}>
                          <td {...editableCellProps} className={`font-medium text-gray-900 ${tableCellClassName}`}>{category}</td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                        </tr>
                      ))}
                      <tr>
                        <td {...editableCellProps} className={`font-semibold uppercase text-gray-900 ${tableCellClassName}`}>
                          Total
                        </td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-right font-semibold text-gray-900`}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        ),
      },
      {
        id: 'endorsements',
        label: 'X. Endorsements & Attachments',
        content: (
          <div className="space-y-6 text-sm text-gray-700">
            <section className="space-y-2">
              <h4 className="text-base font-semibold text-gray-900">Prepared by</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border border-yellow-200">
                  <thead>
                    <tr>
                      <th className={tableHeadCellClassName}>Name / Position</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Signature</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }).map((_, index) => (
                      <tr key={`prepared-row-${index}`}>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-base font-semibold text-gray-900">Reviewed and Verified By</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border border-yellow-200">
                  <thead>
                    <tr>
                      <th className={tableHeadCellClassName}>Name / Position</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Signature</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Extension Chairperson / Director', 'College Dean (for Main Campus only)', 'Campus Director'].map(
                      (label) => (
                        <tr key={`reviewed-row-${label}`}>
                          <td {...editableCellProps} className={tableCellClassName}>{label}</td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-base font-semibold text-gray-900">Endorsed for BOR Approval</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border border-yellow-200">
                  <thead>
                    <tr>
                      <th className={tableHeadCellClassName}>Name / Position</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Signature</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <tr key={`endorse-row-${index}`}>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-base font-semibold text-gray-900">Extension Council Remarks</h4>
              <div className="grid gap-2">
                {['Deferred', 'For Revision', 'Endorsed for BOR Approval'].map((label) => (
                  <label key={label} className="flex items-center gap-3 text-sm font-medium text-gray-900">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-yellow-300 text-yellow-500 focus:ring-yellow-400"
                    />
                    <span {...editableCellProps} className="flex-1 rounded border border-yellow-200 px-3 py-1">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-base font-semibold text-gray-900">Attachments</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border border-yellow-200">
                  <thead>
                    <tr>
                      <th className={tableHeadCellClassName}>Document</th>
                      <th className={`${tableHeadCellClassName} text-center`}>Included</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <tr key={`attachment-row-${index}`}>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td className={`${tableCellClassName} text-center`}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-yellow-300 text-yellow-500 focus:ring-yellow-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ),
      },
      {
        id: 'training-design',
        label: 'XI. Training Design',
        content: (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Project Title
                <input className={inputClassName} placeholder="Enter project title" />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border border-yellow-200 text-sm text-gray-700">
                <thead>
                  <tr>
                    <th className={tableHeadCellClassName}>Competencies / Topics</th>
                    <th className={tableHeadCellClassName}>Number of Hours</th>
                    <th className={tableHeadCellClassName}>Resource Person</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <tr key={`training-row-${index}`}>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  const openPanel = () => {
    setActiveSectionId('project-summary');
    setPanelMounted(true);
    setTimeout(() => setPanelVisible(true), 20);
  };

  const closePanel = () => {
    setPanelVisible(false);
    setTimeout(() => setPanelMounted(false), transitionMs);
  };

  const activeSection = useMemo(() => {
    return proposalSections.find((section) => section.id === activeSectionId) ?? proposalSections[0];
  }, [proposalSections, activeSectionId]);

  useEffect(() => {
    if (!panelMounted) {
      setPanelVisible(false);
    }
  }, [panelMounted]);

  useEffect(() => {
    if (!panelMounted) {
      document.body.style.overflow = '';
      return;
    }

    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [panelMounted]);

  return (
    <>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-yellow-500">Projects</span>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Projects Overview</h1>
              <p className="text-gray-600">{activeItem.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openPanel}
                className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-yellow-600"
              >
                <PlusCircle className="h-4 w-4" />
                New Project
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-yellow-200 px-4 py-2 text-sm font-semibold text-yellow-600 hover:bg-yellow-50">
                <Filter className="h-4 w-4" />
                Filters
              </button>
              {/* <button className="flex items-center gap-2 rounded-lg border border-yellow-200 px-4 py-2 text-sm font-semibold text-yellow-600 hover:bg-yellow-50">
              <CalendarDays className="h-4 w-4" />
              Schedule View
            </button> */}
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-dashed border-yellow-200 bg-white/80 p-10 text-center">
          <div className="mx-auto max-w-xl space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">No projects yet</h2>
            <p className="text-sm text-gray-600">
              Create your first extension project to start planning activities, inviting participants, and tracking impact.
              Once a project is added, it will appear here with quick access to its timeline and beneficiaries.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={openPanel} className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-yellow-600">
                <PlusCircle className="h-4 w-4" />
                New Project
              </button>
              {/* <button className="flex items-center gap-2 rounded-lg border border-yellow-200 px-4 py-2 text-sm font-semibold text-yellow-600 hover:bg-yellow-50">
                <Filter className="h-4 w-4" />
                Import from template
              </button> */}
            </div>
          </div>
        </section>

      </div>

      {panelMounted && (
        <div
          role="dialog"
          aria-modal="true"
          className={`fixed inset-0 z-40 flex bg-black/50 backdrop-blur-sm ${
            panelVisible ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          style={{
            opacity: panelVisible ? 1 : 0,
            transition: `opacity ${transitionMs}ms ease-in-out`,
          }}
        >
          <div
            className="relative flex h-full w-full flex-col bg-white shadow-2xl"
            style={{
              transform: panelVisible ? 'translateX(0%)' : 'translateX(100%)',
              transition: `transform ${transitionMs}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
              willChange: 'transform',
            }}
          >
            <div className="flex items-center justify-between border-b border-yellow-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Project Leader Workspace</p>
                <h2 className="text-lg font-semibold text-gray-900">Project Proposal Builder</h2>
              </div>
              <button
                onClick={closePanel}
                className="rounded-full border border-yellow-200 px-3 py-1 text-sm font-semibold text-yellow-600 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-yellow-100 bg-yellow-50/60">
                <div className="flex gap-2 overflow-x-auto px-4 py-3 text-sm">
                  {proposalSections.map((section) => {
                    const isActive = section.id === activeSectionId;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSectionId(section.id)}
                        className={`whitespace-nowrap rounded-full px-4 py-2 font-medium transition ${
                          isActive
                            ? 'bg-yellow-500 text-white shadow'
                            : 'bg-white text-yellow-700 hover:bg-yellow-100'
                        }`}
                      >
                        {section.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                <div className="mx-auto w-full max-w-6xl space-y-6">
                  <div className="rounded-xl border border-yellow-100 bg-yellow-50/60 p-4 text-xs text-yellow-800">
                    <p className="font-semibold uppercase tracking-wide">Reminder</p>
                    <p>
                      Fill out each section completely. Required subsections and tables are provided to mirror the
                      instructor-approved template.
                    </p>
                  </div>
                  <div className="space-y-5 text-sm text-gray-700">{activeSection.content}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
