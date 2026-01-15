'use client';

import { useMemo, useState, useEffect } from 'react';
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
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Title of the Project
                <input className={inputClassName} placeholder="Enter project title" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Project Locale
                <input className={inputClassName} placeholder="Municipality / Barangay / Campus" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Target Beneficiaries
                <input className={inputClassName} placeholder="Group / Sector" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Total Number of Beneficiaries
                <input className={inputClassName} placeholder="e.g., 60" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Project Duration
                <input className={inputClassName} placeholder="e.g., January – June 2026" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Total Project Cost
                <input className={inputClassName} placeholder="e.g., ₱150,000" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Implementing Academic Program/s
                <input className={inputClassName} placeholder="List participating programs" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Implementing Student Organization/s
                <input className={inputClassName} placeholder="List participating organizations" />
              </label>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Legend</h4>
              <p className="text-xs text-gray-500">Indicate the projected range of beneficiaries covered by this project.</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-700">
                {["1 – 25 beneficiaries", "26 – 50 beneficiaries", "51 – 75 beneficiaries", "76 – 100 beneficiaries"].map(
                  (label) => (
                    <label key={label} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-yellow-300 text-yellow-500 focus:ring-yellow-400"
                      />
                      <span>{label}</span>
                    </label>
                  ),
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'previous-phase-evaluation',
        label: 'II. Project Evaluation (Previous Phase)',
        content: (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">
              Summarize accomplishments, gaps, and lessons from the previous implementation cycle as the basis for the new
              phase proposal.
            </p>
            <ul className="list-disc space-y-2 pl-6 text-sm text-gray-600">
              <li>Highlight completed deliverables and the extent to which objectives were achieved.</li>
              <li>Discuss milestone activities and the level of beneficiary participation in each.</li>
              <li>Identify implementation gaps, bottlenecks, and constraints that affected delivery.</li>
              <li>Describe recommendations or action points that will strengthen the succeeding phase.</li>
            </ul>
            <div className="space-y-4">
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Narrative of Accomplishments
                <textarea
                  className={textareaClassName}
                  rows={6}
                  placeholder="Provide a narrative of completed activities, outputs, and immediate outcomes."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Key Challenges Encountered
                <textarea
                  className={textareaClassName}
                  rows={4}
                  placeholder="Discuss operational or contextual challenges from the previous phase."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                Recommendations for the Next Phase
                <textarea
                  className={textareaClassName}
                  rows={4}
                  placeholder="Outline corrective measures, strategic adjustments, and support required."
                />
              </label>
            </div>
          </div>
        ),
      },
      {
        id: 'rationale',
        label: 'III. Rationale of the Project',
        content: (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Provide the compelling justification for the project using the required subsections. Address the need, its
              significance, and the intended solution.
            </p>
            <div className="grid gap-6">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">A. Statement of Need</h4>
                <textarea
                  className={`${textareaClassName} min-h-[220px]`}
                  rows={10}
                  placeholder="Explain the core problem or unmet need of your target beneficiaries."
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">B. Relevance of Need</h4>
                <textarea
                  className={`${textareaClassName} min-h-[200px]`}
                  rows={8}
                  placeholder="Justify why the institution must respond to this need at this time."
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">C. Beneficiary Profile</h4>
                <textarea
                  className={`${textareaClassName} min-h-[200px]`}
                  rows={8}
                  placeholder="Describe the demographics, socio-economic background, and readiness of the beneficiaries."
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">D. Proposed Solution</h4>
                <textarea
                  className={`${textareaClassName} min-h-[220px]`}
                  rows={10}
                  placeholder="Outline the specific interventions you will implement to address the identified need."
                />
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'goals-objectives',
        label: 'IV. Goals, Objectives & Intended Outcomes',
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
                      <th className={`${tableHeadCellClassName} text-center`} colSpan={3}>
                        Goals/Objectives/Intended Outcomes (follow the required sequence)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 3 }).map((_, rowIndex) => (
                      <tr key={`esd-goal-row-${rowIndex}`} className="align-top">
                        {Array.from({ length: 6 }).map((__, colIndex) => (
                          <td key={`esd-goal-cell-${rowIndex}-${colIndex}`} {...editableCellProps} className={tableCellClassName}></td>
                        ))}
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
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="font-semibold">Guidance</p>
              <p>
                List each SMART objective with its success indicators, baseline, data-gathering methods, frequency, expected
                actual output, means of verification, and remarks. Use additional rows as needed.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border border-yellow-200 text-sm text-gray-700">
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
                  {Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`goals-row-${index}`}>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
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
        id: 'implementation-plan',
        label: 'V. Implementation Plan',
        content: (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Provide the duration, general plan, and specific strategies for delivering the extension project.
            </p>
            <div className="space-y-4">
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                A. Duration & General Plan
                <textarea
                  className={textareaClassName}
                  rows={4}
                  placeholder="Indicate the months and major milestones that will cover the entire project duration."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                B. Implementation Strategies
                <textarea
                  className={textareaClassName}
                  rows={4}
                  placeholder="Discuss the strategies, learning resources, and partnerships that will ensure effective delivery."
                />
              </label>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">C. Implementation Plan Table</h4>
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
                    {Array.from({ length: 8 }).map((_, index) => (
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
              <p className="text-xs text-gray-500">
                Note: Mark the months when activities occur, and update the status and remarks as implementation progresses.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'monitoring-evaluation',
        label: 'VI. Monitoring & Evaluation Plan',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Outline how progress and results will be measured during and after implementation. Include both qualitative
              and quantitative indicators.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border border-yellow-200 text-sm text-gray-700">
                <thead>
                  <tr>
                    <th className={tableHeadCellClassName}>Name</th>
                    <th className={`${tableHeadCellClassName} text-center`}>Male</th>
                    <th className={`${tableHeadCellClassName} text-center`}>Female</th>
                    <th className={`${tableHeadCellClassName} text-center`}>All Gender</th>
                    <th className={tableHeadCellClassName}>Role</th>
                    <th className={tableHeadCellClassName}>Responsibility</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <tr key={`me-row-${index}`}>
                      <td {...editableCellProps} className={tableCellClassName}></td>
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
          </div>
        ),
      },
      {
        id: 'organizational-capability',
        label: 'VII. Organizational Capability',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Present the organization&apos;s capability to deliver the proposed project in paragraph form, addressing the
              guide questions provided in the template.
            </p>
            <ol className="list-decimal space-y-2 pl-6 text-sm text-gray-700">
              <li>What edge or unique capacity does your extension team have to implement this project?</li>
              <li>How will faculty advisers, extensionists, or experts coordinate with student volunteers?</li>
              <li>Identify linkages or partner organizations and describe how each will complement the project.</li>
            </ol>
            <textarea
              className={textareaClassName}
              rows={6}
              placeholder="Compose the organizational capability narrative here."
            />
          </div>
        ),
      },
      {
        id: 'community-extension-team',
        label: 'VIII. Community Extension Team',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              List all members of the community extension team and specify their roles and responsibilities.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border border-yellow-200 text-sm text-gray-700">
                <thead>
                  <tr>
                    <th className={tableHeadCellClassName}>#</th>
                    <th className={tableHeadCellClassName}>Name</th>
                    <th className={tableHeadCellClassName}>Male</th>
                    <th className={tableHeadCellClassName}>Female</th>
                    <th className={tableHeadCellClassName}>All Gender</th>
                    <th className={tableHeadCellClassName}>Role</th>
                    <th className={tableHeadCellClassName}>Responsibility</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <tr key={`team-row-${index}`}>
                      <td {...editableCellProps} className={`${tableCellClassName} text-center`}>{index + 1}</td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
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
            <p className="text-xs text-gray-500">
              Reminders: clearly describe the role of each team member in planning, implementation, monitoring, and
              evaluation. Include student volunteers in the boxes provided.
            </p>
          </div>
        ),
      },
      {
        id: 'sustainability-plan',
        label: 'IX. Sustainability Plan',
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
        label: 'X. Budgetary Requirement',
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
            <div className="space-y-4">
              {[{ label: 'A. Training Expenses', rows: 8 }, { label: 'B. Office Supplies', rows: 6 }].map(({ label, rows }) => (
                <div key={label} className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[768px] border border-yellow-200 text-sm text-gray-700">
                      <thead>
                        <tr>
                          <th className={tableHeadCellClassName}>Description</th>
                          <th className={`${tableHeadCellClassName} text-center`}>Quantity</th>
                          <th className={tableHeadCellClassName}>Unit</th>
                          <th className={`${tableHeadCellClassName} text-right`}>Unit Cost (₱)</th>
                          <th className={`${tableHeadCellClassName} text-right`}>Total Cost (₱)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: rows }).map((_, index) => (
                          <tr key={`${label}-row-${index}`}>
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
                          <td {...editableCellProps} className={`${tableCellClassName} text-right font-semibold text-gray-900`}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <div className="overflow-x-auto">
                  <table className="min-w-[320px] border border-yellow-200 text-sm text-gray-700">
                    <tbody>
                      <tr>
                        <td {...editableCellProps} className={`font-semibold text-gray-900 ${tableCellClassName}`}>Grand Total</td>
                        <td {...editableCellProps} className={`${tableCellClassName} text-right font-semibold text-gray-900`}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Number of Respondents – 30</h4>
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
                      <tr key={`respondent-question-${index}`}>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td className={`${tableCellClassName} text-center`}>
                          <label className="inline-flex items-center justify-center gap-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-yellow-300 text-yellow-500 focus:ring-yellow-400"
                              aria-label="Yes"
                            />
                          </label>
                        </td>
                        <td className={`${tableCellClassName} text-center`}>
                          <label className="inline-flex items-center justify-center gap-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-yellow-300 text-yellow-500 focus:ring-yellow-400"
                              aria-label="No"
                            />
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'endorsements',
        label: 'XI. Endorsements & Attachments',
        content: (
          <div className="space-y-6 text-sm text-gray-700">
            <div className="space-y-3">
              <h4 className="text-base font-semibold text-gray-900">Prepared by</h4>
              <p className="text-xs text-gray-500">
                All members of the team (except for your students) should sign to indicate commitment to the assigned
                roles.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`prepared-by-${index}`}
                    className="flex h-16 items-center justify-between rounded-lg border border-dashed border-yellow-300 px-3"
                  >
                    <span className="text-xs text-gray-500">Signature line</span>
                    <span className="text-xs text-gray-400">Date</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-semibold text-gray-900">Reviewed and Verified By</h4>
              <div className="space-y-2">
                {['Extension Chairperson / Director', 'College Dean (for Main Campus only)', 'Campus Director'].map(
                  (label) => (
                    <div
                      key={label}
                      className="flex h-14 items-center justify-between rounded-lg border border-dashed border-yellow-300 px-3"
                    >
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-xs text-gray-400">Signature / Date</span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-semibold text-gray-900">Extension Council Remarks</h4>
              <div className="flex flex-wrap gap-4">
                {['Deferred', 'For Revision', 'Endorsed for BOR Approval'].map((label) => (
                  <label key={label} className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded border border-yellow-300">
                      <span className="h-3 w-3 rounded bg-yellow-100" />
                    </span>
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-semibold text-gray-900">Attachments</h4>
              <ol className="list-decimal space-y-2 pl-6">
                <li>Research Book</li>
                <li>
                  Extension Paper based on Community Need Assessment (CNA) &mdash; include executive summary of CNA findings,
                  project impact, resulting solution, and recommendations of the extension consultation with partner
                  beneficiaries.
                </li>
                <li>
                  Terminal Report for Phase / Actual Project with impact evaluation and beneficiary data based on CNA.
                </li>
              </ol>
              <p className="text-xs text-gray-500">
                Note: Only complete project proposals will be accepted.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'training-design',
        label: 'XII. Training Design',
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
              <button className="flex items-center gap-2 rounded-lg border border-yellow-200 px-4 py-2 text-sm font-semibold text-yellow-600 hover:bg-yellow-50">
                <CalendarDays className="h-4 w-4" />
                Schedule View
              </button>
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
              <button className="flex items-center gap-2 rounded-lg border border-yellow-200 px-4 py-2 text-sm font-semibold text-yellow-600 hover:bg-yellow-50">
                <Filter className="h-4 w-4" />
                Import from template
              </button>
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
