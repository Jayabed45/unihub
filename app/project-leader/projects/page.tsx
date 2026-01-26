'use client';

import { useMemo, useState, useEffect, useRef, Fragment } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { PlusCircle, Filter, CalendarDays } from 'lucide-react';

import { projectLeaderNavigation } from '../navigation';

const inputClassName =
  'w-full rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-200';
const textareaClassName =
  'w-full rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-200';
const tableCellClassName = 'border border-yellow-200 px-3 py-2 align-top';
const tableHeadCellClassName = 'border border-yellow-200 bg-yellow-100 px-3 py-2 text-left font-semibold text-gray-800';
const tableHeadInputClassName =
  'w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-gray-800 focus:border-yellow-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-200';
const editableCellProps = { contentEditable: true, suppressContentEditableWarning: true } as const;
const esdGoalCount = 17;
const esdGoalColumns = 3;
const implementationTimelineColumnCount = 7;
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

interface LeaderEvaluationCriterion {
  label: string;
  rating: number | null;
  remarks: string;
}

interface LeaderEvaluation {
  title?: string;
  campus?: string;
  criteria?: LeaderEvaluationCriterion[];
  totalScore?: number;
  averageScore?: number;
  overallComments?: string;
  extensionRemarks?: string;
  extensionFlags?: {
    revised?: boolean;
    deferred?: boolean;
  };
}

interface LeaderProject {
  _id: string;
  name: string;
  description: string;
  status?: 'Pending' | 'Approved' | 'Rejected' | string;
  evaluation?: LeaderEvaluation;
}

interface LeaderJoinRequestRow {
  id: string;
  projectId?: string;
  projectName: string;
  projectStatus: 'Pending' | 'Approved' | 'Rejected' | string;
  status: 'Requested' | 'Approved' | 'Rejected' | string;
  requesterId?: string;
  requesterName?: string;
  requesterEmail?: string;
  createdAt?: string;
}

export default function ProjectLeaderProjectsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState('project-summary');
  const [fgdRowCount, setFgdRowCount] = useState(respondentSurveyQuestions.length);
  const [implementationRowCount, setImplementationRowCount] = useState(9);
  const [trainingExpensesRowCount, setTrainingExpensesRowCount] = useState(6);
  const [officeSuppliesRowCount, setOfficeSuppliesRowCount] = useState(6);
  const [otherExpensesRowCount, setOtherExpensesRowCount] = useState(6);
  const [trainingDesignRowCount, setTrainingDesignRowCount] = useState(8);
  const [trainingExpensesTotals, setTrainingExpensesTotals] = useState<Record<number, number>>({});
  const [officeSuppliesTotals, setOfficeSuppliesTotals] = useState<Record<number, number>>({});
  const [otherExpensesTotals, setOtherExpensesTotals] = useState<Record<number, number>>({});
  const [trainingDesignHoursTotals, setTrainingDesignHoursTotals] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRootRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [projects, setProjects] = useState<LeaderProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [viewProjectId, setViewProjectId] = useState<string | null>(null);
  const [viewProjectData, setViewProjectData] = useState<any | null>(null);
  const [optionsOpenProjectId, setOptionsOpenProjectId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'create' | 'review' | 'edit'>('create');
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [evaluationViewProject, setEvaluationViewProject] = useState<LeaderProject | null>(null);
  const [participantsViewProject, setParticipantsViewProject] = useState<LeaderProject | null>(null);
  const [participantsForProject, setParticipantsForProject] = useState<LeaderJoinRequestRow[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [participantsPanelVisible, setParticipantsPanelVisible] = useState(false);
  const [attendanceByParticipant, setAttendanceByParticipant] = useState<Record<string, boolean>>({});

  const parseBudgetNumber = (rawValue: string): number => {
    const cleaned = rawValue.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
    if (!cleaned.trim()) return 0;
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const trainingExpensesSubtotal = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < trainingExpensesRowCount; i++) {
      const value = trainingExpensesTotals[i] ?? 0;
      if (!Number.isFinite(value)) continue;
      sum += value;
    }
    return sum;
  }, [trainingExpensesRowCount, trainingExpensesTotals]);

  const officeSuppliesSubtotal = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < officeSuppliesRowCount; i++) {
      const value = officeSuppliesTotals[i] ?? 0;
      if (!Number.isFinite(value)) continue;
      sum += value;
    }
    return sum;
  }, [officeSuppliesRowCount, officeSuppliesTotals]);

  const otherExpensesSubtotal = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < otherExpensesRowCount; i++) {
      const value = otherExpensesTotals[i] ?? 0;
      if (!Number.isFinite(value)) continue;
      sum += value;
    }
    return sum;
  }, [otherExpensesRowCount, otherExpensesTotals]);

  const totalBudgetaryRequirements = useMemo(
    () => trainingExpensesSubtotal + officeSuppliesSubtotal + otherExpensesSubtotal,
    [trainingExpensesSubtotal, officeSuppliesSubtotal, otherExpensesSubtotal],
  );

  const trainingDesignHoursTotal = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < trainingDesignRowCount; i++) {
      const value = trainingDesignHoursTotals[i] ?? 0;
      if (!Number.isFinite(value)) continue;
      sum += value;
    }
    return sum;
  }, [trainingDesignRowCount, trainingDesignHoursTotals]);

  const evaluationViewStatus = evaluationViewProject?.status || 'Pending';
  const evaluationViewStatusLabel =
    evaluationViewStatus === 'Approved'
      ? 'Approved'
      : evaluationViewStatus === 'Rejected'
      ? 'Rejected'
      : 'Pending approval';
  const evaluationViewStatusColor =
    evaluationViewStatus === 'Approved'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : evaluationViewStatus === 'Rejected'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-yellow-50 text-yellow-700 border-yellow-200';

  const activeItem = useMemo(() => {
    return (
      projectLeaderNavigation.find((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)) ?? 
      projectLeaderNavigation.find((item) => item.href === '/project-leader/projects') ?? 
      projectLeaderNavigation[0]
    );
  }, [pathname]);

  const transitionMs = 360;

  const highlightProjectId = searchParams.get('highlight');
  const viewParticipantsId = searchParams.get('viewParticipants');

  const todayKey = () => new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!highlightProjectId) return;
    const projectCard = document.getElementById(`project-card-${highlightProjectId}`);
    if (!projectCard) return;
    projectCard.scrollIntoView({ behavior: 'smooth' });
    projectCard.classList.add('highlight');
    setTimeout(() => projectCard.classList.remove('highlight'), transitionMs);
  }, [highlightProjectId]);

  const openParticipantsPanel = async (project: LeaderProject) => {
    setParticipantsViewProject(project);
    setParticipantsPanelVisible(false);
    setParticipantsLoading(true);
    setParticipantsError(null);
    setParticipantsForProject([]);
    setAttendanceByParticipant({});

    // kick off slide-in once mounted
    setTimeout(() => {
      setParticipantsPanelVisible(true);
    }, 20);

    const day = todayKey();

    try {
      let leaderId: string | undefined;
      const stored = window.localStorage.getItem('unihub-auth');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
          if (parsed && parsed.id && parsed.role === 'Project Leader') {
            leaderId = parsed.id;
          }
        } catch {
          leaderId = undefined;
        }
      }

      if (!leaderId) {
        setParticipantsError('Missing project leader session. Please log in again.');
        setParticipantsLoading(false);
        return;
      }

      const res = await fetch(
        `http://localhost:5000/api/notifications/join-requests?leaderId=${encodeURIComponent(leaderId)}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load participants');
      }

      const data = (await res.json()) as LeaderJoinRequestRow[];
      const filtered = data.filter((row) => row.projectId === project._id);
      setParticipantsForProject(filtered);

      // Fetch attendance records for this project for the initial day (today)
      try {
        const attendanceRes = await fetch(
          `http://localhost:5000/api/attendance/project?projectId=${encodeURIComponent(
            project._id,
          )}&date=${encodeURIComponent(day)}`,
        );
        if (attendanceRes.ok) {
          const attendanceData = (await attendanceRes.json()) as Array<{
            participantId: string;
            status: 'Active';
          }>;

          const mapped: Record<string, boolean> = {};
          for (const record of attendanceData) {
            if (record.participantId) {
              mapped[record.participantId] = record.status === 'Active';
            }
          }

          setAttendanceByParticipant(mapped);
        } else {
          setAttendanceByParticipant({});
        }
      } catch (attendanceError) {
        console.error('Failed to load attendance for project', attendanceError);
        setAttendanceByParticipant({});
      }
    } catch (error: any) {
      setParticipantsError(error.message || 'Failed to load participants');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const closeParticipantsPanel = () => {
    setParticipantsPanelVisible(false);
    setTimeout(() => {
      setParticipantsViewProject(null);
      setParticipantsForProject([]);
      setParticipantsError(null);
      setAttendanceByParticipant({});
    }, transitionMs);
  };

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
                        {Array.from({ length: fgdRowCount }).map((_, index) => (
                          <tr key={`rationale-fgd-row-${index}`}>
                            <td {...editableCellProps} className={tableCellClassName}></td>
                            <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                            <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFgdRowCount((count) => count + 1)}
                      className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                    >
                      Add row
                    </button>
                    <button
                      type="button"
                      onClick={() => setFgdRowCount((count) => (count > 1 ? count - 1 : 1))}
                      className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                    >
                      Delete row
                    </button>
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
                      {Array.from({ length: implementationTimelineColumnCount }).map((_, index) => (
                        <th key={`timeline-month-${index}`} className={`${tableHeadCellClassName} text-center`}>
                          <input
                            type="text"
                            className={`${tableHeadInputClassName} text-center`}
                            placeholder={`Timeline ${index + 1}`}
                          />
                        </th>
                      ))}
                      <th className={tableHeadCellClassName}>Status</th>
                      <th className={tableHeadCellClassName}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: implementationRowCount }).map((_, index) => (
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
                        <td {...editableCellProps} className={tableCellClassName}></td>
                        <td {...editableCellProps} className={tableCellClassName}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setImplementationRowCount((count) => count + 1)}
                  className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                >
                  Add row
                </button>
                <button
                  type="button"
                  onClick={() => setImplementationRowCount((count) => (count > 1 ? count - 1 : 1))}
                  className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                >
                  Delete row
                </button>
              </div>
              <div className="space-y-2 rounded-lg border border-yellow-200 bg-white p-4 text-sm text-gray-700">
                <h5 className="font-semibold text-gray-900">Tips</h5>
                <textarea className={`${textareaClassName} min-h-[120px]`} />
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
          <div className="space-y-4 text-sm text-gray-700">
            <div className="space-y-2">
              <p className="font-medium text-gray-900">
                A. Explain why your extension team is the best group to implement this project.
              </p>
              <p className="font-medium text-gray-900">
                B. What expertise do you bring to the project?
              </p>
              <p className="font-medium text-gray-900">
                C. Describe your partner organizations/groups. Explain how you complement each other and why you have
                selected them as partners.
              </p>
              <p className="font-medium text-gray-900">D. Explain who will do what.</p>
            </div>
            <div>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Your response
                </span>
                <textarea
                  className={textareaClassName}
                  rows={8}
                  placeholder="Provide a single, integrated answer addressing points A–D above."
                />
              </label>
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
                    <th className={`${tableHeadCellClassName} min-w-[220px]`}>
                      Name
                    </th>
                    <th className={`${tableHeadCellClassName} text-center w-40`}>
                      Gender
                    </th>
                    <th className={`${tableHeadCellClassName} w-40`}>
                      All Gender <span className="block text-[11px] font-normal">(Please specify)</span>
                    </th>
                    <th className={tableHeadCellClassName}>
                      Role
                    </th>
                    <th className={tableHeadCellClassName}>
                      Responsibility
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <tr key={`team-row-${index}`}>
                      <td {...editableCellProps} className={`${tableCellClassName} min-w-[220px]`}></td>
                      <td className={`${tableCellClassName} text-center w-40`}>
                        <select
                          className={`${inputClassName} h-8 w-full`}
                          defaultValue=""
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </td>
                      <td className={`${tableCellClassName} w-40`}>
                        <input
                          className={`${inputClassName} h-8 w-full`}
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
                      {Array.from({ length: trainingExpensesRowCount }).map((_, index) => (
                        <tr key={`training-row-${index}`}>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                          <td className={`${tableCellClassName} text-right`}>
                            <input
                              type="text"
                              className="w-full border-none bg-transparent text-right text-sm text-gray-900 focus:outline-none focus:ring-0"
                              onChange={(event) => {
                                const parsed = parseBudgetNumber(event.target.value);
                                setTrainingExpensesTotals((prev) => ({
                                  ...prev,
                                  [index]: parsed,
                                }));
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className={`font-semibold text-gray-900 ${tableCellClassName}`}>Sub-total</td>
                        <td className={`${tableCellClassName} text-center`}></td>
                        <td className={tableCellClassName}></td>
                        <td className={`${tableCellClassName} text-right`}></td>
                        <td className={`${tableCellClassName} text-right font-semibold text-gray-900`}>
                          {trainingExpensesSubtotal > 0
                            ? trainingExpensesSubtotal.toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : ''}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTrainingExpensesRowCount((count) => count + 1)}
                    className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                  >
                    Add row
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrainingExpensesRowCount((count) => (count > 1 ? count - 1 : 1))}
                    className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                  >
                    Delete row
                  </button>
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
                      {Array.from({ length: officeSuppliesRowCount }).map((_, index) => (
                        <tr key={`office-row-${index}`}>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-center`}></td>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                          <td className={`${tableCellClassName} text-right`}>
                            <input
                              type="text"
                              className="w-full border-none bg-transparent text-right text-sm text-gray-900 focus:outline-none focus:ring-0"
                              onChange={(event) => {
                                const parsed = parseBudgetNumber(event.target.value);
                                setOfficeSuppliesTotals((prev) => ({
                                  ...prev,
                                  [index]: parsed,
                                }));
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className={`font-semibold text-gray-900 ${tableCellClassName}`}>Sub-total</td>
                        <td className={`${tableCellClassName} text-center`}></td>
                        <td className={tableCellClassName}></td>
                        <td className={`${tableCellClassName} text-right`}></td>
                        <td className={`${tableCellClassName} text-right font-semibold text-gray-900`}>
                          {officeSuppliesSubtotal > 0
                            ? officeSuppliesSubtotal.toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : ''}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setOfficeSuppliesRowCount((count) => count + 1)}
                    className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                  >
                    Add row
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfficeSuppliesRowCount((count) => (count > 1 ? count - 1 : 1))}
                    className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                  >
                    Delete row
                  </button>
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
                      {Array.from({ length: otherExpensesRowCount }).map((_, index) => (
                        <tr key={`other-row-${index}`}>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={tableCellClassName}></td>
                          <td {...editableCellProps} className={`${tableCellClassName} text-right`}></td>
                          <td className={`${tableCellClassName} text-right`}>
                            <input
                              type="text"
                              className="w-full border-none bg-transparent text-right text-sm text-gray-900 focus:outline-none focus:ring-0"
                              onChange={(event) => {
                                const parsed = parseBudgetNumber(event.target.value);
                                setOtherExpensesTotals((prev) => ({
                                  ...prev,
                                  [index]: parsed,
                                }));
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className={`font-semibold text-gray-900 ${tableCellClassName}`}>Sub-total</td>
                        <td className={tableCellClassName}></td>
                        <td className={`${tableCellClassName} text-right`}></td>
                        <td className={`${tableCellClassName} text-right font-semibold text-gray-900`}>
                          {otherExpensesSubtotal > 0
                            ? otherExpensesSubtotal.toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : ''}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setOtherExpensesRowCount((count) => count + 1)}
                    className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                  >
                    Add row
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtherExpensesRowCount((count) => (count > 1 ? count - 1 : 1))}
                    className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                  >
                    Delete row
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Total Budgetary Requirements</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border border-yellow-200 text-sm text-gray-700">
                    <tbody>
                      {['A. Training Expenses', 'B. Office Supplies', 'C. Other Expenses'].map((category) => (
                        <tr key={`budget-summary-${category}`}>
                          <td className={`font-medium text-gray-900 ${tableCellClassName}`}>{category}</td>
                          <td className={`${tableCellClassName} text-right`}>
                            {category === 'A. Training Expenses'
                              ? trainingExpensesSubtotal.toLocaleString('en-PH', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : category === 'B. Office Supplies'
                              ? officeSuppliesSubtotal.toLocaleString('en-PH', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : otherExpensesSubtotal.toLocaleString('en-PH', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className={`font-semibold uppercase text-gray-900 ${tableCellClassName}`}>
                          Total
                        </td>
                        <td className={`${tableCellClassName} text-right font-semibold text-gray-900`}>
                          {totalBudgetaryRequirements > 0
                            ? totalBudgetaryRequirements.toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : ''}
                        </td>
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
        id: 'training-design',
        label: 'X. Training Design',
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
                  {Array.from({ length: trainingDesignRowCount }).map((_, index) => (
                    <tr key={`training-row-${index}`}>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                      <td className={tableCellClassName}>
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          className="w-full border-none bg-transparent text-sm text-gray-900 focus:outline-none focus:ring-0"
                          onChange={(event) => {
                            const raw = event.target.value.replace(/,/g, '');
                            const parsed = parseFloat(raw);
                            setTrainingDesignHoursTotals((prev) => ({
                              ...prev,
                              [index]: Number.isNaN(parsed) ? 0 : parsed,
                            }));
                          }}
                        />
                      </td>
                      <td {...editableCellProps} className={tableCellClassName}></td>
                    </tr>
                  ))}
                  <tr>
                    <td className={`font-semibold text-gray-900 ${tableCellClassName}`}>
                      Total Hours
                    </td>
                    <td className={`${tableCellClassName} font-semibold text-gray-900`}>
                      {trainingDesignHoursTotal > 0 ? trainingDesignHoursTotal.toString() : ''}
                    </td>
                    <td {...editableCellProps} className={tableCellClassName}></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTrainingDesignRowCount((count) => count + 1)}
                className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
              >
                Add row
              </button>
              <button
                type="button"
                onClick={() => setTrainingDesignRowCount((count) => (count > 1 ? count - 1 : 1))}
                className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
              >
                Delete row
              </button>
            </div>
          </div>
        ),
      },
    ],
    [
      pathname,
      fgdRowCount,
      implementationRowCount,
      trainingExpensesRowCount,
      officeSuppliesRowCount,
      otherExpensesRowCount,
      trainingDesignRowCount,
      trainingExpensesSubtotal,
      officeSuppliesSubtotal,
      otherExpensesSubtotal,
      totalBudgetaryRequirements,
      trainingDesignHoursTotal,
    ],
  );

  const openPanel = () => {
    setActiveSectionId('project-summary');
    setPanelMounted(true);
    setTimeout(() => setPanelVisible(true), 20);
  };

  const openCreatePanel = () => {
    setPanelMode('create');
    setViewProjectId(null);
    setViewProjectData(null);
    openPanel();
  };

  const openReviewPanel = (projectId: string) => {
    setPanelMode('review');
    setViewProjectId(projectId);
    openPanel();
  };

  useEffect(() => {
    const fetchProjects = async () => {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const stored = window.localStorage.getItem('unihub-auth');
        if (!stored) {
          setProjectsLoading(false);
          return;
        }

        let projectLeaderId: string | null = null;
        try {
          const parsed = JSON.parse(stored) as { id?: string } | null;
          projectLeaderId = parsed?.id ?? null;
        } catch {
          projectLeaderId = null;
        }

        const url = projectLeaderId
          ? `http://localhost:5000/api/projects?projectLeaderId=${encodeURIComponent(projectLeaderId)}`
          : 'http://localhost:5000/api/projects';

        const res = await fetch(url);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load projects');
        }

        const data = (await res.json()) as LeaderProject[];
        setProjects(data);
      } catch (error: any) {
        setProjectsError(error.message || 'Failed to load projects');
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem('unihub-auth');
    if (!stored) {
      return;
    }

    let parsed: { id?: string; role?: string } | null = null;
    try {
      parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
    } catch {
      parsed = null;
    }

    if (!parsed || !parsed.id) {
      return;
    }

    try {
      const socket = io('http://localhost:5000');
      socketRef.current = socket;

      socket.emit('notifications:subscribe', {
        userId: parsed.id,
        role: parsed.role,
      });

      const handleRefresh = async () => {
        setProjectsLoading(true);
        setProjectsError(null);
        try {
          const projectLeaderId = parsed?.id ?? null;

          const url = projectLeaderId
            ? `http://localhost:5000/api/projects?projectLeaderId=${encodeURIComponent(projectLeaderId)}`
            : 'http://localhost:5000/api/projects';

          const res = await fetch(url);
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to load projects');
          }

          const data = (await res.json()) as LeaderProject[];
          setProjects(data);
        } catch (error: any) {
          setProjectsError(error.message || 'Failed to load projects');
        } finally {
          setProjectsLoading(false);
        }
      };

      socket.on('notifications:refresh', handleRefresh);

      return () => {
        socket.off('notifications:refresh', handleRefresh);
        socket.disconnect();
        socketRef.current = null;
      };
    } catch {
      // ignore client socket errors
    }
  }, []);

  useEffect(() => {
    if (!viewProjectId || !panelVisible) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/projects/${viewProjectId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load project');
        }
        const data = await res.json();
        if (!cancelled) {
          setViewProjectData(data);
        }
      } catch (error: any) {
        console.error('Failed to load project for view', error);
        if (!cancelled) {
          setSaveError(error.message || 'Failed to load project for view');
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [viewProjectId, panelVisible]);

  useEffect(() => {
    if (!panelVisible || !panelRef.current || !viewProjectData) {
      return;
    }

    const root = panelRef.current;
    const proposal = (viewProjectData as any).proposalData as Record<string, any> | undefined;
    if (!proposal) {
      return;
    }

    for (const section of proposalSections) {
      const snapshot = proposal[section.id];
      if (!snapshot) continue;

      const sectionElement = root.querySelector<HTMLElement>(`[data-section-id="${section.id}"]`);
      if (!sectionElement) continue;

      if (Array.isArray(snapshot.inputs)) {
        const nodes = Array.from(sectionElement.querySelectorAll('input, textarea, select')) as Array<
          HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement
        >;
        snapshot.inputs.forEach((saved: any, index: number) => {
          const el = nodes[index];
          if (!el) return;
          const type = (el as HTMLInputElement).type;
          const isCheckbox = type === 'checkbox';

          if (isCheckbox) {
            (el as HTMLInputElement).checked = Boolean(saved.checked);
          } else if ('value' in el && saved.value != null) {
            (el as any).value = saved.value;
          }
        });
      }

      if (Array.isArray(snapshot.editableCells)) {
        const cells = Array.from(
          sectionElement.querySelectorAll<HTMLElement>('[contenteditable="true"]'),
        );
        snapshot.editableCells.forEach((value: string, index: number) => {
          const cell = cells[index];
          if (!cell) return;
          cell.innerText = value ?? '';
        });
      }
    }
  }, [panelVisible, viewProjectData, proposalSections]);

  useEffect(() => {
    if (!panelRef.current) return;

    const contentRoot = panelRef.current.querySelector<HTMLElement>('[data-panel-content="true"]');
    if (!contentRoot) return;

    const nodes = Array.from(
      contentRoot.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>(
        'input, textarea, select, button',
      ),
    );

    if (panelMode === 'review' && panelVisible) {
      nodes.forEach((node) => {
        if (node instanceof HTMLButtonElement) {
          node.disabled = true;
        } else if (node instanceof HTMLInputElement) {
          node.disabled = true;
        } else if (node instanceof HTMLTextAreaElement) {
          node.disabled = true;
        } else if (node instanceof HTMLSelectElement) {
          node.disabled = true;
        }
      });
    } else {
      nodes.forEach((node) => {
        if ('disabled' in node) {
          (node as any).disabled = false;
        }
      });
    }
  }, [panelMode, panelVisible, viewProjectData]);

  const handleDeleteProject = async (projectId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this project? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error((data as any).message || 'Failed to delete project');
      }

      setProjects((prev) => prev.filter((project) => project._id !== projectId));
      if (viewProjectId === projectId) {
        setViewProjectId(null);
      }
      setOptionsOpenProjectId((current) => (current === projectId ? null : current));
    } catch (error: any) {
      setProjectsError(error.message || 'Failed to delete project');
    }
  };

  const handleSaveProposal = async () => {
    if (isSaving) return;
    if (!panelRef.current) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const root = panelRef.current;

      const sectionsSnapshot: Record<string, any> = {};

      for (const section of proposalSections) {
        const sectionElement = root.querySelector<HTMLElement>(`[data-section-id="${section.id}"]`);
        if (!sectionElement) continue;

        const inputs: any[] = [];
        const cleanupAttributeFns: Array<() => void> = [];

        sectionElement.querySelectorAll('input, textarea, select').forEach((node, index) => {
          const el = node as HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement;
          const type = (el as HTMLInputElement).type;
          const isCheckbox = type === 'checkbox';
          const currentValue = !isCheckbox ? (el as any).value ?? '' : undefined;
          const currentChecked = isCheckbox ? (el as any).checked : undefined;

          const prevValueAttr = el.getAttribute('value');
          const prevCheckedAttr = el.getAttribute('checked');

          if (!isCheckbox) {
            el.setAttribute('value', currentValue ?? '');
            cleanupAttributeFns.push(() => {
              if (prevValueAttr === null) {
                el.removeAttribute('value');
              } else {
                el.setAttribute('value', prevValueAttr);
              }
            });
          } else {
            if (currentChecked) {
              el.setAttribute('checked', 'checked');
            } else {
              el.removeAttribute('checked');
            }
            cleanupAttributeFns.push(() => {
              if (prevCheckedAttr === null) {
                el.removeAttribute('checked');
              } else {
                el.setAttribute('checked', prevCheckedAttr);
              }
            });
          }

          inputs.push({
            index,
            tag: el.tagName,
            type,
            name: el.name || undefined,
            placeholder: 'placeholder' in el ? (el as any).placeholder : undefined,
            value: currentValue,
            checked: currentChecked,
          });
        });

        const editableCells: string[] = [];
        sectionElement.querySelectorAll('[contenteditable="true"]').forEach((node) => {
          const cell = node as HTMLElement;
          const value = cell.innerText.trim();
          editableCells.push(value);
        });

        const textContent = sectionElement.innerText;
        const htmlContent = sectionElement.innerHTML;

        cleanupAttributeFns.forEach((fn) => fn());

        sectionsSnapshot[section.id] = {
          textContent,
          htmlContent,
          inputs,
          editableCells,
        };
      }

      const stored = window.localStorage.getItem('unihub-auth');
      if (!stored) {
        throw new Error('Missing project leader session. Please log in again.');
      }

      let projectLeaderId: string | null = null;
      try {
        const parsed = JSON.parse(stored) as { id?: string } | null;
        projectLeaderId = parsed?.id ?? null;
      } catch {
        projectLeaderId = null;
      }

      if (!projectLeaderId) {
        throw new Error('Unable to determine project leader ID from session.');
      }

      const summarySection = panelRef.current.querySelector<HTMLElement>('[data-section-id="project-summary"]');
      const titleInput = summarySection?.querySelector<HTMLInputElement>('input[placeholder="Enter project title"]');
      const name = titleInput?.value ?? 'Untitled Project';

      const totalsPayload = {
        trainingExpensesSubtotal,
        officeSuppliesSubtotal,
        otherExpensesSubtotal,
        totalBudgetaryRequirements,
        trainingDesignHoursTotal,
      };

      let response: Response;
      if (panelMode === 'create') {
        // Create a brand new project
        response = await fetch('http://localhost:5000/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            description: 'Extension project proposal',
            projectLeaderId,
            sections: sectionsSnapshot,
            totals: totalsPayload,
          }),
        });
      } else {
        // Update existing project proposal in edit mode
        if (!viewProjectId) {
          throw new Error('Missing project ID for editing. Please close and reopen this project.');
        }

        let leaderId: string | undefined;
        try {
          const stored = window.localStorage.getItem('unihub-auth');
          if (stored) {
            const parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
            if (parsed && parsed.id) {
              leaderId = parsed.id;
            }
          }
        } catch {
          leaderId = undefined;
        }

        response = await fetch(
          `http://localhost:5000/api/projects/${encodeURIComponent(viewProjectId)}/proposal`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              proposalData: sectionsSnapshot,
              name,
              totals: totalsPayload,
              updaterId: leaderId,
              updaterRole: 'Project Leader',
            }),
          },
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save project proposal');
      }

      if (panelMode === 'create') {
        setSaveMessage('Project created successfully.');
        setViewProjectId(null);
        setViewProjectData(null);
      } else {
        setSaveMessage('Project updated successfully.');
      }

      try {
        const stored = window.localStorage.getItem('unihub-auth');
        let projectLeaderId: string | null = null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as { id?: string } | null;
            projectLeaderId = parsed?.id ?? null;
          } catch {
            projectLeaderId = null;
          }
        }

        const url = projectLeaderId
          ? `http://localhost:5000/api/projects?projectLeaderId=${encodeURIComponent(projectLeaderId)}`
          : 'http://localhost:5000/api/projects';

        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as LeaderProject[];
          setProjects(data);
        }

        // After creating a project, close the panel once the list is refreshed
        if (panelMode === 'create') {
          closePanel();
        }
      } catch (error) {
        console.error('Failed to refresh projects after save', error);
      }
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save proposal.');
    } finally {
      setIsSaving(false);
    }
  };

  const closePanel = () => {
    setPanelVisible(false);
    setTimeout(() => setPanelMounted(false), transitionMs);
  };

  useEffect(() => {
    if (!panelMounted) {
      setPanelVisible(false);
    }
  }, [panelMounted]);

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (!highlightId || !listRootRef.current || projects.length === 0) {
      return;
    }

    const card = listRootRef.current.querySelector<HTMLElement>(
      `[data-leader-project-id="${highlightId}"]`,
    );
    if (!card) {
      return;
    }

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('ring-4', 'ring-yellow-400', 'ring-offset-2', 'ring-offset-yellow-50');

    const timeoutId = window.setTimeout(() => {
      card.classList.remove('ring-4', 'ring-yellow-400', 'ring-offset-2', 'ring-offset-yellow-50');
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [projects, searchParams, listRootRef]);

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
                onClick={openCreatePanel}
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

        <section className="rounded-2xl border border-dashed border-yellow-200 bg-white/80 p-10">
          {projectsLoading ? (
            <div className="text-center text-sm text-gray-600">Loading projects…</div>
          ) : projectsError ? (
            <div className="text-center text-sm text-red-600">{projectsError}</div>
          ) : projects.length === 0 ? (
            <div className="mx-auto max-w-xl space-y-4 text-center">
              <h2 className="text-xl font-semibold text-gray-900">No projects yet</h2>
              <p className="text-sm text-gray-600">
                Create your first extension project to start planning activities, inviting participants, and tracking impact.
                Once a project is added, it will appear here with quick access to its timeline and beneficiaries.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={openCreatePanel} className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-yellow-600">
                  <PlusCircle className="h-4 w-4" />
                  New Project
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Your projects</h2>
                  <p className="text-xs text-gray-500">Recently saved proposals appear here so you can review or continue editing.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" ref={listRootRef}>
                {projects.map((project) => {
                  const status = project.status || 'Pending';
                  const statusLabel =
                    status === 'Approved'
                      ? 'Approved'
                      : status === 'Rejected'
                      ? 'Rejected'
                      : 'Pending approval';
                  const hasEvaluation = !!project.evaluation;

                  return (
                    <div
                      key={project._id}
                      data-leader-project-id={project._id}
                      className="flex h-full flex-col rounded-xl border border-yellow-100 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex-1 space-y-1">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{project.name}</h3>
                        <p className="text-xs text-gray-600 line-clamp-3">{project.description}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 font-medium text-yellow-700">
                            {statusLabel}
                          </span>
                          {hasEvaluation && (
                            <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              Evaluated
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOptionsOpenProjectId((current) =>
                                current === project._id ? null : project._id,
                              )
                            }
                            className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                          >
                            Options
                          </button>
                          {optionsOpenProjectId === project._id && (
                            <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-yellow-100 bg-white py-1 text-left text-[11px] shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  openReviewPanel(project._id);
                                  setOptionsOpenProjectId(null);
                                }}
                                className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-yellow-50"
                              >
                                Review project
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void openParticipantsPanel(project);
                                  setOptionsOpenProjectId(null);
                                }}
                                className="block w-full px-3 py-1.5 text-left text-sky-700 hover:bg-sky-50"
                              >
                                View participants
                              </button>
                              {hasEvaluation && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEvaluationViewProject(project);
                                    setOptionsOpenProjectId(null);
                                  }}
                                  className="block w-full px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50"
                                >
                                  View evaluation
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteProject(project._id)}
                                className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
            ref={panelRef}
            className="relative flex h-full w-full flex-col bg-white shadow-2xl"
            style={{
              transform: panelVisible ? 'translateX(0%)' : 'translateX(100%)',
              transition: `transform ${transitionMs}ms cubic-bezier(0.22, 0.61, 0.36, 1)` ,
              willChange: 'transform',
            }}
          >
            <div className="flex items-center justify-between border-b border-yellow-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Project Leader Workspace</p>
                <h2 className="text-lg font-semibold text-gray-900">Project Proposal Builder</h2>
              </div>
              <div className="flex items-center gap-2">
                {saveError ? (
                  <span className="text-xs font-medium text-red-600">{saveError}</span>
                ) : saveMessage ? (
                  <span className="text-xs font-medium text-green-600">{saveMessage}</span>
                ) : null}
                {panelMode === 'create' || panelMode === 'edit' ? (
                  <button
                    type="button"
                    onClick={handleSaveProposal}
                    disabled={isSaving}
                    className="rounded-full bg-yellow-500 px-3 py-1 text-sm font-semibold text-white shadow hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving
                      ? panelMode === 'create'
                        ? 'Creating…'
                        : 'Saving…'
                      : panelMode === 'create'
                      ? 'Create project'
                      : 'Save project'}
                  </button>
                ) : null}
                {panelMode === 'review' && (
                  <button
                    type="button"
                    onClick={() => setShowEditConfirm(true)}
                    className="rounded-full border border-yellow-300 px-3 py-1 text-sm font-semibold text-yellow-700 hover:bg-yellow-50"
                  >
                    Edit project
                  </button>
                )}
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-full border border-yellow-200 px-3 py-1 text-sm font-semibold text-yellow-600 hover:bg-yellow-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex h-full min-h-0">
              <aside className="hidden w-64 border-r border-yellow-100 bg-yellow-50/60 p-4 text-sm text-gray-800 sm:flex sm:flex-col">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-yellow-700">Sections</p>
                <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                  {proposalSections.map((section) => {
                    const isActive = section.id === activeSectionId;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSectionId(section.id)}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                          isActive
                            ? 'bg-yellow-500 text-white shadow'
                            : 'bg-white text-yellow-800 hover:bg-yellow-100'
                        }`}
                      >
                        {section.label}
                      </button>
                    );
                  })}
                </nav>
              </aside>
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8" data-panel-content="true">
                <div className="mx-auto w-full max-w-6xl space-y-6">
                  <div className="rounded-xl border border-yellow-100 bg-yellow-50/60 p-4 text-xs text-yellow-800">
                    <p className="font-semibold uppercase tracking-wide">Reminder</p>
                    <p>
                      Fill out each section completely. Required subsections and tables are provided to mirror the
                      instructor-approved template.
                    </p>
                  </div>
                  <div
                    className={`space-y-5 text-sm text-gray-700 ${panelMode === 'review' ? 'pointer-events-none opacity-75' : ''}`}
                  >
                    {proposalSections.map((section) => (
                      <div
                        key={section.id}
                        data-section-id={section.id}
                        className={section.id === activeSectionId ? 'space-y-5' : 'hidden'}
                        aria-hidden={section.id === activeSectionId ? 'false' : 'true'}
                      >
                        {section.content}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {showEditConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
                  <h3 className="text-sm font-semibold text-gray-900">Edit this project?</h3>
                  <p className="mt-2 text-xs text-gray-600">
                    You are currently reviewing a submitted proposal. Editing will allow you to change the original
                    fields. Continue to edit this project?
                  </p>
                  <div className="mt-4 flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowEditConfirm(false)}
                      className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      No, keep reviewing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditConfirm(false);
                        setPanelMode('edit');
                        setSaveError(null);
                        setSaveMessage(null);
                      }}
                      className="rounded-full bg-yellow-500 px-3 py-1 font-semibold text-white shadow hover:bg-yellow-600"
                    >
                      Yes, edit project
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {participantsViewProject && (
        <div
          className="fixed inset-0 z-30 flex bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl rounded-l-2xl"
            style={{
              transform: participantsPanelVisible ? 'translateX(0%)' : 'translateX(100%)',
              transition: `transform ${transitionMs}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
            }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Project participants</p>
                <h2 className="text-base font-semibold text-gray-900 line-clamp-1">
                  {participantsViewProject.name}
                </h2>
                <p className="text-[11px] text-gray-500 line-clamp-1">
                  Participants, join requests, and attendance for this project.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[11px] text-gray-700">
                  <span className="font-semibold">Date</span>
                  <input
                    type="date"
                    defaultValue={todayKey()}
                    onChange={async (event) => {
                      const value = event.target.value || todayKey();
                      if (!participantsViewProject) return;
                      try {
                        const attendanceRes = await fetch(
                          `http://localhost:5000/api/attendance/project?projectId=${encodeURIComponent(
                            participantsViewProject._id,
                          )}&date=${encodeURIComponent(value)}`,
                        );
                        if (attendanceRes.ok) {
                          const attendanceData = (await attendanceRes.json()) as Array<{
                            participantId: string;
                            status: 'Active';
                          }>;

                          const mapped: Record<string, boolean> = {};
                          for (const record of attendanceData) {
                            if (record.participantId) {
                              mapped[record.participantId] = record.status === 'Active';
                            }
                          }

                          setAttendanceByParticipant(mapped);
                        } else {
                          setAttendanceByParticipant({});
                        }
                      } catch (attendanceError) {
                        console.error('Failed to load attendance for selected date', attendanceError);
                        setAttendanceByParticipant({});
                      }
                    }}
                    className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-800 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeParticipantsPanel}
                  className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 text-sm text-gray-800">
              {participantsLoading ? (
                <div className="py-10 text-center text-xs text-gray-500">Loading participants…</div>
              ) : participantsError ? (
                <div className="py-10 text-center text-xs text-red-600">{participantsError}</div>
              ) : participantsForProject.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-500">
                  No participants have requested to join this project yet.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50/80">
                          <th className="sticky left-0 z-10 border-b border-gray-200 bg-gray-50/90 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Name
                          </th>
                          <th className="border-b border-gray-200 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Email
                          </th>
                          <th className="border-b border-gray-200 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Attendance
                          </th>
                          <th className="border-b border-gray-200 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Requested at
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantsForProject.map((row) => {
                        const requestedAtLabel = row.createdAt
                          ? new Date(row.createdAt).toLocaleString('en-PH', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : '';

                        const isActive = !!(row.requesterId && attendanceByParticipant[row.requesterId]);
                        const attendanceLabel = isActive ? 'Active' : 'Inactive';
                        const attendanceClass = isActive
                          ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200'
                          : 'inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700 border border-gray-200';

                        return (
                          <tr key={row.id} className="transition-colors hover:bg-gray-50">
                            <td className="sticky left-0 z-0 whitespace-nowrap border-b border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-900">
                              {row.requesterName || 'Unknown participant'}
                            </td>
                            <td className="border-b border-gray-100 px-4 py-2 align-middle text-sm text-gray-800">
                              {row.requesterEmail || '—'}
                            </td>
                            <td className="border-b border-gray-100 px-4 py-2 align-middle text-sm">
                              <span className={attendanceClass}>{attendanceLabel}</span>
                            </td>
                            <td className="border-b border-gray-100 px-4 py-2 text-right align-middle text-xs text-gray-500">
                              {requestedAtLabel}
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {evaluationViewProject && (
        <div
          className="fixed inset-0 z-30 flex bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex h-full w-full flex-col bg-white shadow-2xl"
            style={{
              transform: 'translateX(0%)',
            }}
          >
            <div className="flex items-center justify-between border-b border-yellow-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Project Evaluation</p>
                <h2 className="text-lg font-semibold text-gray-900">Admin evaluation result</h2>
                <p className="text-xs text-gray-600 line-clamp-1">{evaluationViewProject.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${evaluationViewStatusColor}`}
                >
                  {evaluationViewStatusLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setEvaluationViewProject(null)}
                  className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              <div className="mx-auto w-full max-w-5xl space-y-6 text-sm text-gray-800">
                {!evaluationViewProject.evaluation ? (
                  <div className="text-center text-xs text-gray-500">
                    This project does not have an evaluation yet.
                  </div>
                ) : (
                  <>
                    <section className="space-y-3 rounded-xl border border-yellow-100 bg-yellow-50/60 p-4">
                      <h3 className="text-sm font-semibold text-gray-900">Proposal information</h3>
                      <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-center">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                          Title of the Proposal
                        </span>
                        <p className="rounded-lg border border-yellow-100 bg-white px-3 py-2 text-sm text-gray-900">
                          {evaluationViewProject.evaluation?.title || evaluationViewProject.name}
                        </p>
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">Campus</span>
                        <p className="rounded-lg border border-yellow-100 bg-white px-3 py-2 text-sm text-gray-900">
                          {evaluationViewProject.evaluation?.campus || '—'}
                        </p>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Criteria for Evaluation (Phase 2 and Above / Continuing)
                        </h3>
                        <p className="text-xs text-gray-500">
                          Ratings and remarks entered by the admin evaluator.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border border-yellow-100 text-xs sm:text-sm text-gray-800">
                          <thead>
                            <tr>
                              <th className="border border-yellow-100 bg-yellow-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                Criteria for Evaluation
                              </th>
                              <th className="w-32 border border-yellow-100 bg-yellow-50 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                Rating
                              </th>
                              <th className="border border-yellow-100 bg-yellow-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                Remarks / Comments
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(evaluationViewProject.evaluation?.criteria || []).map((row, index) => (
                              <tr key={`${row.label}-${index}`} className="align-top">
                                <td className="border border-yellow-100 px-3 py-2 text-xs sm:text-sm">
                                  {row.label}
                                </td>
                                <td className="border border-yellow-100 px-3 py-2 text-center align-middle text-xs sm:text-sm">
                                  {typeof row.rating === 'number' && Number.isFinite(row.rating)
                                    ? row.rating.toFixed(2)
                                    : '—'}
                                </td>
                                <td className="border border-yellow-100 px-3 py-2 text-xs sm:text-sm">
                                  {row.remarks || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-yellow-50/70">
                              <td className="border border-yellow-100 px-3 py-2 text-right text-xs font-semibold text-gray-900">
                                TOTAL SCORE
                              </td>
                              <td className="border border-yellow-100 px-3 py-2 text-center text-xs font-semibold text-gray-900">
                                {typeof evaluationViewProject.evaluation?.totalScore === 'number'
                                  ? evaluationViewProject.evaluation.totalScore.toFixed(2)
                                  : '—'}
                              </td>
                              <td className="border border-yellow-100 px-3 py-2" />
                            </tr>
                            <tr className="bg-yellow-50/70">
                              <td className="border border-yellow-100 px-3 py-2 text-right text-xs font-semibold text-gray-900">
                                TOTAL AVERAGE POINTS
                              </td>
                              <td className="border border-yellow-100 px-3 py-2 text-center text-xs font-semibold text-gray-900">
                                {typeof evaluationViewProject.evaluation?.averageScore === 'number'
                                  ? evaluationViewProject.evaluation.averageScore.toFixed(2)
                                  : '—'}
                              </td>
                              <td className="border border-yellow-100 px-3 py-2" />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </section>

                    <section className="space-y-3 rounded-xl border border-yellow-100 bg-white p-4">
                      <h3 className="text-sm font-semibold text-gray-900">Overall comments / recommendations</h3>
                      <p className="whitespace-pre-wrap rounded-lg border border-yellow-100 bg-yellow-50/50 px-3 py-2 text-sm text-gray-900">
                        {evaluationViewProject.evaluation?.overallComments || '—'}
                      </p>
                    </section>

                    <section className="space-y-3 rounded-xl border border-yellow-100 bg-white p-4">
                      <h3 className="text-sm font-semibold text-gray-900">Extension Proposal Remarks</h3>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-800">
                        <div className="inline-flex items-center gap-2">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-yellow-300 bg-white text-[10px] font-bold text-yellow-600">
                            {evaluationViewProject.evaluation?.extensionFlags?.revised ? '✓' : ''}
                          </span>
                          <span>Revised</span>
                        </div>
                        <div className="inline-flex items-center gap-2">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-yellow-300 bg-white text-[10px] font-bold text-yellow-600">
                            {evaluationViewProject.evaluation?.extensionFlags?.deferred ? '✓' : ''}
                          </span>
                          <span>Deferred</span>
                        </div>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                          Additional remarks
                        </span>
                        <p className="whitespace-pre-wrap rounded-lg border border-yellow-100 bg-yellow-50/50 px-3 py-2 text-sm text-gray-900">
                          {evaluationViewProject.evaluation?.extensionRemarks || '—'}
                        </p>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
