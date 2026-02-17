
'use client';

import { useMemo, useState, useEffect, useRef, Fragment } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { PlusCircle, Filter, CalendarDays, CheckCircle2, Eye, FileText, MoreVertical, Trash2 } from 'lucide-react';

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

interface ApplicantRow {
  id: string;
  email: string;
  fullName?: string;
  createdAtLabel: string;
  status: 'Pending' | 'Approved';
}

interface LeaderProject {
  _id: string;
  name: string;
  description: string;
  status?: 'Pending' | 'Approved' | 'Rejected' | string;
  evaluation?: LeaderEvaluation;
  applicants?: ApplicantRow[];
  isSubmitted?: boolean;
}

interface ProjectActivity {
  activityId: number;
  title: string;
  hours?: string;
  resourcePerson?: string;
  startAt?: string | null;
  endAt?: string | null;
  location?: string | null;
}

export default function ProjectLeaderProjectsPage() {
  const pathname = usePathname();
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
  const [projects, setProjects] = useState<LeaderProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantsError, setApplicantsError] = useState<string | null>(null);
  const [applicantRespondingId, setApplicantRespondingId] = useState<string | null>(null);
  const [viewProjectId, setViewProjectId] = useState<string | null>(null);
  const [viewProjectData, setViewProjectData] = useState<any | null>(null);
  const [optionsOpenProjectId, setOptionsOpenProjectId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'create' | 'review' | 'edit'>('create');
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [evaluationViewProject, setEvaluationViewProject] = useState<LeaderProject | null>(null);
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  const searchParams = useSearchParams();
  const highlightProjectId = searchParams.get('highlightProjectId');
  const highlightActivityTitle = searchParams.get('highlightActivityTitle');
  const openPanelParam = searchParams.get('openPanel');
  const sectionParam = searchParams.get('section');
  const [currentPanelProjectStatus, setCurrentPanelProjectStatus] = useState<string | null>(null);
  const [activitiesModalOpen, setActivitiesModalOpen] = useState(false);
  const [activitiesModalProject, setActivitiesModalProject] = useState<LeaderProject | null>(null);
  const [activitiesForModal, setActivitiesForModal] = useState<ProjectActivity[]>([]);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extensionRows, setExtensionRows] = useState<
    Array<{ topic: string; hours: string; resourcePerson: string }>
  >([{ topic: '', hours: '', resourcePerson: '' }]);
  const [extensionSaving, setExtensionSaving] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [attendanceViewOpen, setAttendanceViewOpen] = useState(false);
  const [attendanceActivity, setAttendanceActivity] = useState<ProjectActivity | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<
    Array<{ participantEmail: string; fullName?: string; status: 'registered' | 'present' | 'absent'; updatedAt?: string }>
  >([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceUpdatingEmail, setAttendanceUpdatingEmail] = useState<string | null>(null);
  const [terminalReportOpen, setTerminalReportOpen] = useState(false);
  const [terminalReportLoading, setTerminalReportLoading] = useState(false);
  const [terminalReportError, setTerminalReportError] = useState<string | null>(null);
  const [terminalReportTotals, setTerminalReportTotals] = useState<
    | {
        totalActivities: number;
        totalRegistrations: number;
        present: number;
        absent: number;
        notOnAttendance: number;
        activities: Array<{
          title: string;
          present: number;
          absent: number;
          total: number;
        }>;
      }
    | null
  >(null);
  const socketRef = useRef<Socket | null>(null);
  const [highlightedProjectActivity, setHighlightedProjectActivity] = useState<
    | {
        projectId: string;
        activityTitle: string;
      }
    | null
  >(null);
  const [activityScheduleDrafts, setActivityScheduleDrafts] = useState<
    Record<string, { startAt: string; endAt: string; location: string }>
  >({});
  const [activityScheduleSavingKey, setActivityScheduleSavingKey] = useState<string | null>(null);
  const [activityScheduleError, setActivityScheduleError] = useState<string | null>(null);
  const [applicantProfileOpen, setApplicantProfileOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantRow | null>(null);

  const getProjectActivities = (project: LeaderProject): ProjectActivity[] => {
    const fullProject = project as any;
    const trainingSnapshot =
      fullProject && fullProject.proposalData && fullProject.proposalData['training-design'];

    let parsed: ProjectActivity[] = [];

    const schedule: Array<{ activityId: number; startAt?: string; endAt?: string; location?: string | null }> =
      Array.isArray((project as any).activitySchedule)
        ? ((project as any).activitySchedule as any[]).map((item) => ({
            activityId: Number(item.activityId),
            startAt: item.startAt as string | undefined,
            endAt: item.endAt as string | undefined,
            location: typeof item.location === 'string' ? item.location : undefined,
          }))
        : [];

    if (trainingSnapshot && Array.isArray(trainingSnapshot.editableCells)) {
      const cells: string[] = trainingSnapshot.editableCells;
      let activityIndexCounter = 0;

      // For training design, editableCells are stored as pairs per row:
      // [topicRow0, resourceRow0, topicRow1, resourceRow1, ... , footerResourceCell]
      for (let i = 0; i + 1 < cells.length; i += 2) {
        const title = (cells[i] || '').trim();
        const resourcePerson = (cells[i + 1] || '').trim();

        // Skip rows without a topic (also skips the final 'Total Hours' resource-only cell)
        if (!title) {
          continue;
        }

        const scheduleEntry = schedule.find((item) => item.activityId === activityIndexCounter);

        parsed.push({
          activityId: activityIndexCounter,
          title,
          resourcePerson: resourcePerson || undefined,
          startAt: scheduleEntry?.startAt ?? null,
          endAt: scheduleEntry?.endAt ?? null,
          location: scheduleEntry?.location ?? null,
        });

        activityIndexCounter += 1;
      }
    }

    // Append any saved extension activities as additional entries
    try {
      const existingExt: Array<{ topic?: string; hours?: number | null; resourcePerson?: string }> =
        Array.isArray(fullProject.extensionActivities) ? fullProject.extensionActivities : [];

      if (existingExt.length > 0) {
        let nextActivityId = parsed.length
          ? parsed.reduce((max, item) => (item.activityId > max ? item.activityId : max), parsed[0].activityId) + 1
          : 0;

        existingExt.forEach((item, index) => {
          const rawTopic = typeof item.topic === 'string' ? item.topic.trim() : '';
          const title = rawTopic || `Extension activity ${index + 1}`;

          if (!title) return;

          const numericHours =
            typeof item.hours === 'number' && Number.isFinite(item.hours) && item.hours >= 0
              ? String(item.hours)
              : undefined;
          const resourcePerson =
            typeof item.resourcePerson === 'string' && item.resourcePerson.trim()
              ? item.resourcePerson.trim()
              : undefined;

          const scheduleEntry = schedule.find((entry) => entry.activityId === nextActivityId);

          parsed.push({
            activityId: nextActivityId,
            title,
            hours: numericHours,
            resourcePerson,
            startAt: scheduleEntry?.startAt ?? null,
            endAt: scheduleEntry?.endAt ?? null,
            location: scheduleEntry?.location ?? null,
          });

          nextActivityId += 1;
        });
      }
    } catch {
      // ignore extension parsing errors
    }

    if (highlightedProjectActivity && highlightedProjectActivity.projectId === project._id) {
      parsed = [...parsed].sort((a, b) => {
        const isAHighlighted = a.title === highlightedProjectActivity.activityTitle;
        const isBHighlighted = b.title === highlightedProjectActivity.activityTitle;
        if (isAHighlighted === isBHighlighted) return 0;
        return isAHighlighted ? -1 : 1;
      });
    }

    return parsed;
  };

  const fetchTerminalReport = async (project: LeaderProject, activities: ProjectActivity[]) => {
    setTerminalReportOpen(true);
    setTerminalReportLoading(true);
    setTerminalReportError(null);
    setTerminalReportTotals(null);

    try {
      const projectId = project._id;
      const now = nowMs;

      const endedActivities = activities.filter((activity) => {
        const endDate = activity.endAt ? new Date(activity.endAt) : undefined;
        const hasValidEnd = !!endDate && !Number.isNaN(endDate.getTime());
        return hasValidEnd && endDate!.getTime() < now;
      });

      const totalActivities = endedActivities.length;

      let totalRegistrations = 0;
      let present = 0;
      let absent = 0;
      const activitySummaries: Array<{ title: string; present: number; absent: number; total: number }> = [];

      let activeBeneficiaryEmails = new Set<string>();
      try {
        const benRes = await fetch(`http://localhost:5000/api/projects/${projectId}/beneficiaries`);
        if (benRes.ok) {
          const benData = (await benRes.json()) as Array<{
            email: string;
            status: 'active' | 'removed';
          }>;
          benData
            .filter((b) => b.status === 'active')
            .forEach((b) => {
              const email = typeof b.email === 'string' ? b.email.trim() : '';
              if (email) {
                activeBeneficiaryEmails.add(email);
              }
            });
        }
      } catch {
        activeBeneficiaryEmails = new Set<string>();
      }

      const registrationEmails = new Set<string>();

      for (const activity of endedActivities) {
        let activityPresent = 0;
        let activityAbsent = 0;
        let activityTotal = 0;
        try {
          const regRes = await fetch(
            `http://localhost:5000/api/projects/${projectId}/activities/${activity.activityId}/registrations`,
          );
          if (!regRes.ok) {
            continue;
          }

          const regData = (await regRes.json()) as Array<{
            participantEmail: string;
            status: 'registered' | 'present' | 'absent';
          }>;

          totalRegistrations += regData.length;

          regData.forEach((row) => {
            const email = typeof row.participantEmail === 'string' ? row.participantEmail.trim() : '';
            if (email) {
              registrationEmails.add(email);
            }
            if (row.status === 'present') {
              present += 1;
              activityPresent += 1;
            } else if (row.status === 'absent') {
              absent += 1;
              activityAbsent += 1;
            }
            activityTotal += 1;
          });
        } catch {
          continue;
        }

        activitySummaries.push({
          title: activity.title,
          present: activityPresent,
          absent: activityAbsent,
          total: activityTotal,
        });
      }

      let matched = 0;
      activeBeneficiaryEmails.forEach((email) => {
        if (registrationEmails.has(email)) {
          matched += 1;
        }
      });

      const notOnAttendance = Math.max(activeBeneficiaryEmails.size - matched, 0);

      setTerminalReportTotals({
        totalActivities,
        totalRegistrations,
        present,
        absent,
        notOnAttendance,
        activities: activitySummaries,
      });
    } catch (error: any) {
      setTerminalReportError(error.message || 'Failed to load terminal report');
    } finally {
      setTerminalReportLoading(false);
    }
  };

  const openTerminalReportForCurrentProject = async () => {
    if (!activitiesModalProject) {
      return;
    }
    await fetchTerminalReport(activitiesModalProject, activitiesForModal);
  };

  const openTerminalReportFromCard = (project: LeaderProject) => {
    const activities = getProjectActivities(project);
    setActivitiesModalProject(project);
    setActivitiesForModal(activities);
    // Ensure the activities modal is NOT opened, only the terminal report modal
    setActivitiesModalOpen(false); 
    fetchTerminalReport(project, activities);
  };

  const renderProjectCard = (project: LeaderProject) => {
    const status = project.status || 'Pending';
    const isSubmitted = project.isSubmitted === true;

    const statusLabel = !isSubmitted
      ? 'Draft – not submitted'
      : status === 'Approved'
      ? 'Approved'
      : status === 'Rejected'
      ? 'Rejected'
      : 'Pending approval';
    const hasEvaluation = !!project.evaluation;
    const isHighlighted = project._id === highlightProjectId;

    const statusTone = !isSubmitted
      ? 'border-gray-200 bg-gray-50 text-gray-700'
      : status === 'Approved'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'Rejected'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-yellow-200 bg-yellow-50 text-yellow-700';

    return (
      <div
        key={project._id}
        onClick={() => {
          openReviewPanel(project._id);
        }}
        className={`flex h-full flex-col rounded-2xl border bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
          isHighlighted
            ? 'border-yellow-400 shadow-yellow-300 ring-2 ring-yellow-300 animate-pulse'
            : 'border-yellow-100'
        } cursor-pointer`}
      >
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{project.name}</h3>
          <p className="text-xs text-gray-600 line-clamp-3">{project.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 text-xs">
          <div className="flex flex-col gap-1">
            {!(!isSubmitted) && (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusTone}`}>
              {statusLabel}
            </span>
            )}
            {hasEvaluation && (
              <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Evaluated
              </span>
            )}
          </div>
          <div className="relative flex items-center gap-1">
            {status === 'Approved' && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openActivitiesModal(project);
                  }}
                  title="View activities"
                  className="rounded-full border border-yellow-200 p-1.5 text-yellow-700 transition hover:bg-yellow-50 hover:text-yellow-800"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openTerminalReportFromCard(project);
                  }}
                  title="Terminal report"
                  className="rounded-full border border-yellow-200 p-1.5 text-yellow-700 transition hover:bg-yellow-50 hover:text-yellow-800"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOptionsOpenProjectId((current) => (current === project._id ? null : project._id));
              }}
              className="rounded-full border border-yellow-200 p-1.5 text-yellow-700 transition hover:bg-yellow-50 hover:text-yellow-800"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {optionsOpenProjectId === project._id && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-yellow-100 bg-white py-1 text-left text-[11px] shadow-lg">
                {hasEvaluation && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEvaluationViewProject(project);
                      setOptionsOpenProjectId(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View evaluation
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteProject(project._id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete project
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOptionsOpenProjectId(null);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-yellow-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const parseBudgetNumber = (rawValue: string): number => {
    const cleaned = rawValue.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
    if (!cleaned.trim()) return 0;
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const toDateTimeLocalValue = (value?: string | null): string => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';

    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!highlightProjectId || !highlightActivityTitle) {
      return;
    }

    setHighlightedProjectActivity({
      projectId: highlightProjectId,
      activityTitle: highlightActivityTitle,
    });
  }, [highlightProjectId, highlightActivityTitle]);

  const attendanceActivityStatus = (() => {
    if (!attendanceActivity) {
      return { isUpcoming: false, isOngoing: false, isExpired: false };
    }

    const startDate = attendanceActivity.startAt ? new Date(attendanceActivity.startAt) : undefined;
    const endDate = attendanceActivity.endAt ? new Date(attendanceActivity.endAt) : undefined;

    const hasValidStart = !!startDate && !Number.isNaN(startDate.getTime());
    const hasValidEnd = !!endDate && !Number.isNaN(endDate.getTime());

    const now = nowMs;
    const isExpired = hasValidEnd && endDate!.getTime() < now;
    const isOngoing = hasValidStart && hasValidEnd && startDate!.getTime() <= now && now <= endDate!.getTime();
    const isUpcoming = hasValidStart && !isOngoing && !isExpired && startDate!.getTime() > now;

    return { isUpcoming, isOngoing, isExpired };
  })();

  const canEditAttendance = attendanceActivityStatus.isOngoing;

  const activeItem = useMemo(() => {
    return (
      projectLeaderNavigation.find((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)) ?? 
      projectLeaderNavigation.find((item) => item.href === '/project-leader/projects') ?? 
      projectLeaderNavigation[0]
    );
  }, [pathname]);

  const transitionMs = 360;

  const { upcomingLeaderProjects, ongoingLeaderProjects, completedLeaderProjects } = useMemo(() => {
    const now = nowMs;

    const upcoming: LeaderProject[] = [];
    const ongoing: LeaderProject[] = [];
    const completed: LeaderProject[] = [];

    projects.forEach((project) => {
      const isSubmitted = project.isSubmitted === true;

      // Proposals (Drafts) - Only projects that are NOT submitted
      if (!isSubmitted) {
        upcoming.push(project);
        return;
      }

      const rawSchedule: Array<{ activityId?: number; startAt?: string; endAt?: string }> = Array.isArray(
        (project as any).activitySchedule,
      )
        ? ((project as any).activitySchedule as any[])
        : [];

      if (rawSchedule.length === 0) {
        // Submitted but no schedule (e.g. Pending, Rejected, or Approved but not scheduled)
        ongoing.push(project);
        return;
      }

      let anyOngoing = false;
      let allEnded = rawSchedule.length > 0;

      rawSchedule.forEach((item) => {
        const startMs = item.startAt ? new Date(item.startAt).getTime() : NaN;
        const endMs = item.endAt ? new Date(item.endAt).getTime() : NaN;
        const hasStart = Number.isFinite(startMs);
        const hasEnd = Number.isFinite(endMs);
        const isOngoing = hasStart && hasEnd && startMs <= now && now <= endMs;
        const isEnded = hasEnd && endMs < now;

        if (isOngoing) {
          anyOngoing = true;
        }
        if (!isEnded) {
          allEnded = false;
        }
      });

      if (anyOngoing) {
        ongoing.push(project);
      } else if (allEnded) {
        completed.push(project);
      } else {
        // Approved project with only future activities: still considered approved (not for-approval).
        ongoing.push(project);
      }
    });

    return { upcomingLeaderProjects: upcoming, ongoingLeaderProjects: ongoing, completedLeaderProjects: completed };
  }, [projects, nowMs]);

  const canExtendActivitiesForCurrentProject = useMemo(() => {
    if (!activitiesModalProject || activitiesForModal.length === 0) {
      // If there are no activities yet, allow defining extension activities.
      return true;
    }

    const now = nowMs;

    // If at least one activity is not expired, we still allow extensions.
    return activitiesForModal.some((activity) => {
      const startDate = activity.startAt ? new Date(activity.startAt) : undefined;
      const endDate = activity.endAt ? new Date(activity.endAt) : undefined;

      const hasValidStart = !!startDate && !Number.isNaN(startDate.getTime());
      const hasValidEnd = !!endDate && !Number.isNaN(endDate.getTime());

      const isExpired = hasValidEnd && endDate!.getTime() < now;

      // Treat activities without a clear expired flag as still extendable.
      if (!hasValidStart && !hasValidEnd) {
        return true;
      }

      return !isExpired;
    });
  }, [activitiesForModal, activitiesModalProject, nowMs]);

  const selectedProjectIsCompleted = useMemo(() => {
    if (!activitiesModalProject) return false;
    return completedLeaderProjects.some((p) => p._id === activitiesModalProject._id);
  }, [activitiesModalProject, completedLeaderProjects]);

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
     setCurrentPanelProjectStatus(null);
    openPanel();
  };

  const openReviewPanel = (projectId: string) => {
    const project = projects.find((item) => item._id === projectId);
    setCurrentPanelProjectStatus((project?.status as string) || 'Pending');
    setPanelMode('review');
    setViewProjectId(projectId);
    openPanel();
  };

  const openActivitiesModal = (project: LeaderProject) => {
    const parsed = getProjectActivities(project);
    setActivitiesForModal(parsed);
    setActivitiesModalProject(project);
    setActivitiesModalOpen(true);
  };

  const openExtensionActivitiesModal = () => {
    if (!activitiesModalProject) return;

    try {
      const fullProject = activitiesModalProject as any;
      const existing: Array<{ topic?: string; hours?: number | null; resourcePerson?: string }> =
        Array.isArray(fullProject.extensionActivities) ? fullProject.extensionActivities : [];

      if (existing.length > 0) {
        const mapped = existing.map((item) => ({
          topic: (item.topic || '').trim(),
          hours:
            typeof item.hours === 'number' && Number.isFinite(item.hours) && item.hours >= 0
              ? String(item.hours)
              : '',
          resourcePerson: (item.resourcePerson || '').trim(),
        }));

        // Always provide one extra empty row so project leaders can add a new
        // extension activity without overwriting existing ones.
        setExtensionRows([...mapped, { topic: '', hours: '', resourcePerson: '' }]);
      } else {
        setExtensionRows([{ topic: '', hours: '', resourcePerson: '' }]);
      }
    } catch {
      setExtensionRows([{ topic: '', hours: '', resourcePerson: '' }]);
    }

    setExtensionError(null);
    setExtensionModalOpen(true);
  };

  const handleSaveExtensionActivities = async () => {
    if (!activitiesModalProject) return;

    const projectId = activitiesModalProject._id;

    const payloadActivities = extensionRows
      .map((row) => ({
        topic: row.topic.trim(),
        hours: row.hours.trim(),
        resourcePerson: row.resourcePerson.trim(),
      }))
      .filter((row) => row.topic || row.hours || row.resourcePerson);

    setExtensionSaving(true);
    setExtensionError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${encodeURIComponent(projectId)}/extension-activities`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activities: payloadActivities }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).message || 'Failed to save extension activities');
      }

      const data = (await res.json()) as {
        projectId: string;
        activities: Array<{ topic: string; hours: number | null; resourcePerson: string }>;
      };

      setExtensionRows(
        data.activities.length
          ? data.activities.map((item) => ({
              topic: item.topic || '',
              hours:
                typeof item.hours === 'number' && Number.isFinite(item.hours) && item.hours >= 0
                  ? String(item.hours)
                  : '',
              resourcePerson: item.resourcePerson || '',
            }))
          : [{ topic: '', hours: '', resourcePerson: '' }],
      );

      setProjects((prev) =>
        prev.map((proj) =>
          proj._id === data.projectId
            ? ({
                ...(proj as any),
                extensionActivities: data.activities,
              } as any)
            : proj,
        ),
      );

      // Refresh the visible activity list so extension activities appear immediately
      const updatedProject =
        activitiesModalProject && activitiesModalProject._id === data.projectId
          ? ({ ...(activitiesModalProject as any), extensionActivities: data.activities } as LeaderProject)
          : null;

      if (updatedProject) {
        setActivitiesModalProject(updatedProject);
        openActivitiesModal(updatedProject);
      }

      setExtensionModalOpen(false);
    } catch (err: any) {
      setExtensionError(err.message || 'Failed to save extension activities');
    } finally {
      setExtensionSaving(false);
    }
  };

  const fetchApplicantsForProject = async (projectId: string) => {
    if (!projectId) {
      setApplicants([]);
      return;
    }

    setApplicantsLoading(true);
    setApplicantsError(null);

    try {
      // 1) Load notifications to find pending join requests for this project
      const notifRes = await fetch('http://localhost:5000/api/notifications');
      if (!notifRes.ok) {
        const data = await notifRes.json().catch(() => ({}));
        throw new Error((data as any).message || 'Failed to load applicants');
      }

      const notifData = (await notifRes.json()) as Array<{
        _id: string;
        title: string;
        message: string;
        project?: string;
        createdAt?: string;
      }>;

      const joinRequests = notifData.filter(
        (item) => item.title === 'Join request' && item.project && String(item.project) === String(projectId),
      );

      const joinResponses = notifData.filter(
        (item) =>
          (item.title === 'Join request approved' || item.title === 'Join request declined') &&
          item.project &&
          String(item.project) === String(projectId),
      );

      let pendingRows: ApplicantRow[] = joinRequests
        .filter((joinItem) => {
          const message = joinItem.message || '';
          const emailFromJoin = message.endsWith(' wants to join')
            ? message.replace(' wants to join', '').trim()
            : message.trim();

          if (!emailFromJoin) return false;

          const hasResponse = joinResponses.some((resp) => {
            if (!resp.message) return false;
            const respEmail = resp.message.split(' - ')[0]?.trim();
            return respEmail === emailFromJoin;
          });

          return !hasResponse;
        })
        .map((item) => {
          const message = item.message || '';
          const email = message.endsWith(' wants to join')
            ? message.replace(' wants to join', '').trim()
            : message.trim();

          const createdAtLabel = item.createdAt
            ? new Date(item.createdAt).toLocaleString('en-PH', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : '';

          return {
            id: item._id,
            email,
            createdAtLabel,
            status: 'Pending',
          };
        });

      // 2) Look up full names for pending applicants via the auth users endpoint
      try {
        const uniquePendingEmails = Array.from(
          new Set(pendingRows.map((row) => (typeof row.email === 'string' ? row.email.trim().toLowerCase() : ''))),
        ).filter((email) => !!email);

        if (uniquePendingEmails.length > 0) {
          const usersRes = await fetch('http://localhost:5000/api/auth/users');
          if (usersRes.ok) {
            const users = (await usersRes.json()) as Array<{ email?: string; username?: string }>;
            const nameByEmail = new Map<string, string>();

            users.forEach((user) => {
              const rawEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
              const username = typeof user.username === 'string' ? user.username.trim() : '';
              if (rawEmail && username) {
                nameByEmail.set(rawEmail, username);
              }
            });

            pendingRows = pendingRows.map((row) => {
              const key = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
              const fullName = key ? nameByEmail.get(key) : undefined;
              return fullName
                ? {
                    ...row,
                    fullName,
                  }
                : row;
            });
          }
        }
      } catch {
        // If lookup fails, we still show email as the name fallback
      }

      // 3) Load approved beneficiaries for this project
      const approvedRows: ApplicantRow[] = [];
      try {
        const benRes = await fetch(`http://localhost:5000/api/projects/${encodeURIComponent(projectId)}/beneficiaries`);
        if (benRes.ok) {
          const benData = (await benRes.json()) as Array<{
            email?: string;
            fullName?: string;
            status?: string;
            joinedAt?: string;
          }>;

          benData
            .filter((b) => b.status && b.status !== 'removed')
            .forEach((b, index) => {
              const rawEmail = typeof b.email === 'string' ? b.email.trim() : '';
              if (!rawEmail) return;

              const fullName = typeof b.fullName === 'string' && b.fullName.trim() ? b.fullName.trim() : undefined;

              const createdAtLabel = b.joinedAt
                ? new Date(b.joinedAt).toLocaleString('en-PH', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : '';

              approvedRows.push({
                id: `approved:${index}:${rawEmail}`,
                email: rawEmail,
                fullName,
                createdAtLabel,
                status: 'Approved',
              });
            });
        }
      } catch {
        // beneficiaries are optional; ignore errors here
      }

      // 4) Merge pending + approved, dedupe by email so each appears once with best status
      const byEmail = new Map<string, ApplicantRow>();
      approvedRows.forEach((row) => {
        const emailKey = row.email.toLowerCase();
        if (!byEmail.has(emailKey)) {
          byEmail.set(emailKey, row);
        }
      });
      pendingRows.forEach((row) => {
        const emailKey = row.email.toLowerCase();
        if (!byEmail.has(emailKey)) {
          byEmail.set(emailKey, row);
        } else {
          // If someone is already approved but also has a pending request, keep the approved entry
          const existing = byEmail.get(emailKey)!;
          if (existing.status === 'Pending' && row.status === 'Approved') {
            byEmail.set(emailKey, row);
          }
        }
      });

      const merged = Array.from(byEmail.values());

      // Sort by status (Pending first) then by createdAt label
      merged.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'Pending' ? -1 : 1;
        }
        return a.createdAtLabel.localeCompare(b.createdAtLabel);
      });

      setApplicants(merged);
    } catch (error: any) {
      setApplicantsError(error.message || 'Failed to load applicants');
      setApplicants([]);
    } finally {
      setApplicantsLoading(false);
    }
  };

  const handleApplicantDecision = async (
    projectId: string,
    email: string,
    decision: 'approved' | 'declined',
  ) => {
    if (!projectId || !email) return;

    setApplicantRespondingId(email);
    setApplicantsError(null);

    try {
      const res = await fetch(
        `http://localhost:5000/api/projects/${encodeURIComponent(projectId)}/join/respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, decision }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).message || 'Failed to respond to applicant');
      }

      await fetchApplicantsForProject(projectId);
    } catch (error: any) {
      setApplicantsError(error.message || 'Failed to respond to applicant');
    } finally {
      setApplicantRespondingId(null);
    }
  };

  const handleRemoveApprovedApplicant = async (projectId: string, email: string) => {
    if (!projectId || !email) return;

    setApplicantRespondingId(email);
    setApplicantsError(null);

    try {
      const res = await fetch(
        `http://localhost:5000/api/projects/${encodeURIComponent(projectId)}/beneficiaries`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, status: 'removed' }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).message || 'Failed to remove participant from project');
      }

      await fetchApplicantsForProject(projectId);
    } catch (error: any) {
      setApplicantsError(error.message || 'Failed to remove participant from project');
    } finally {
      setApplicantRespondingId(null);
    }
  };

  const handleSaveActivitySchedule = async (
    projectId: string,
    activity: ProjectActivity,
    startValue: string,
    endValue: string,
    locationValue: string,
  ) => {
    if (!projectId) return;

    const scheduleKey = `${projectId}:${activity.activityId}`;
    setActivityScheduleSavingKey(scheduleKey);
    setActivityScheduleError(null);

    try {
      const body: Record<string, string> = {};
      if (startValue) body.startAt = startValue;
      if (endValue) body.endAt = endValue;
      body.location = locationValue ?? '';

      const res = await fetch(
        `http://localhost:5000/api/projects/${projectId}/activities/${activity.activityId}/schedule`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update activity schedule');
      }

      const data = (await res.json()) as {
        activityId: number;
        startAt?: string | null;
        endAt?: string | null;
        location?: string | null;
      };

      setActivitiesForModal((prev) =>
        prev.map((item) =>
          item.activityId === data.activityId
            ? { ...item, startAt: data.startAt ?? null, endAt: data.endAt ?? null, location: data.location ?? null }
            : item,
        ),
      );

      setAttendanceActivity((prev) =>
        prev && prev.activityId === data.activityId
          ? { ...prev, startAt: data.startAt ?? null, endAt: data.endAt ?? null, location: data.location ?? null }
          : prev,
      );

      setActivityScheduleDrafts((prev) => {
        const next = { ...prev };
        delete next[scheduleKey];
        return next;
      });
    } catch (error: any) {
      setActivityScheduleError(error.message || 'Failed to update activity schedule');
    } finally {
      setActivityScheduleSavingKey(null);
    }
  };

  const openAttendanceView = (activity: ProjectActivity) => {
    setAttendanceActivity(activity);
    setAttendanceRows([]);
    setAttendanceError(null);
    setAttendanceViewOpen(true);
  };



  const handleAttendanceUpdate = async (email: string, status: 'present' | 'absent') => {
    if (!activitiesModalProject || !attendanceActivity) {
      return;
    }

    setAttendanceUpdatingEmail(email);
    setAttendanceError(null);

    try {
      const res = await fetch(
        `http://localhost:5000/api/projects/${activitiesModalProject._id}/activities/${attendanceActivity.activityId}/registrations`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, status }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update attendance');
      }

      const updated = (await res.json()) as {
        participantEmail: string;
        status: 'registered' | 'present' | 'absent';
        updatedAt?: string;
      };

      setAttendanceRows((prev) =>
        prev.map((row) =>
          row.participantEmail === updated.participantEmail
            ? { ...row, status: updated.status, updatedAt: updated.updatedAt }
            : row,
        ),
      );
    } catch (err: any) {
      setAttendanceError(err.message || 'Failed to update activity attendance');
    } finally {
      setAttendanceUpdatingEmail(null);
    }
  };

  useEffect(() => {
    if (!attendanceViewOpen || !attendanceActivity || !activitiesModalProject) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      setAttendanceLoading(true);
      setAttendanceError(null);

      try {
        const [regRes, benRes] = await Promise.all([
          fetch(
            `http://localhost:5000/api/projects/${activitiesModalProject._id}/activities/${attendanceActivity.activityId}/registrations`,
          ),
          fetch(`http://localhost:5000/api/projects/${activitiesModalProject._id}/beneficiaries`),
        ]);

        if (!regRes.ok) {
          const data = await regRes.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load activity registrations');
        }

        const regData = (await regRes.json()) as Array<{
          participantEmail: string;
          status: 'registered' | 'present' | 'absent';
          updatedAt?: string;
        }>;

        let nameByEmail = new Map<string, string | undefined>();
        if (benRes.ok) {
          try {
            const benData = (await benRes.json()) as Array<{
              email: string;
              fullName?: string;
              status: 'active' | 'removed';
            }>;
            benData
              .filter((b) => b.status === 'active')
              .forEach((b) => {
                const email = typeof b.email === 'string' ? b.email.trim() : '';
                if (email) {
                  nameByEmail.set(email, b.fullName || undefined);
                }
              });
          } catch {
            nameByEmail = new Map();
          }
        }

        if (!cancelled) {
          setAttendanceRows(
            regData.map((row) => {
              const email = typeof row.participantEmail === 'string' ? row.participantEmail.trim() : '';
              const fullName = email ? nameByEmail.get(email) : undefined;
              return {
                participantEmail: row.participantEmail,
                fullName,
                status: row.status,
                updatedAt: row.updatedAt,
              };
            }),
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          setAttendanceError(err.message || 'Failed to load activity registrations');
        }
      } finally {
        if (!cancelled) {
          setAttendanceLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [attendanceViewOpen, attendanceActivity, activitiesModalProject]);

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

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (highlightProjectId && openPanelParam === 'true' && projects.length > 0) {
      const project = projects.find((p) => p._id === highlightProjectId);
      if (project) {
        // Only open if not already open to avoid resetting state if user interacts
        if (viewProjectId !== highlightProjectId || !panelVisible) {
          openReviewPanel(highlightProjectId);
        }
        
        if (sectionParam) {
          setActiveSectionId(sectionParam);
          if (sectionParam === 'applicants-section') {
            fetchApplicantsForProject(highlightProjectId);
          }
        }
      }
    }
  }, [highlightProjectId, openPanelParam, sectionParam, projects, viewProjectId, panelVisible]);

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('notification:new', (payload: any) => {
      if (!payload || typeof payload.title !== 'string') {
        return;
      }

      if (payload.title === 'Project approved') {
        fetchProjects();
      }

      if (payload.title === 'Activity join') {
        const message: string | undefined = (payload as any).message;
        const projectId: string | undefined = (payload as any).projectId;

        if (message && projectId) {
          let activityTitle = '';
          const titleMatch = message.match(/joined activity\s+"(.+?)"/);
          if (titleMatch && titleMatch[1]) {
            activityTitle = titleMatch[1].trim();
          }

          if (activityTitle) {
            setHighlightedProjectActivity({ projectId, activityTitle });
          }
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
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
    if (!panelRef.current || !panelVisible) return;

    const root = panelRef.current;

    // Use a more generic selector or ensure IDs are correct.
    // Sometimes components might re-render, so we might need a MutationObserver if elements appear later.
    // For now, let's try to attach event listeners more robustly or on a parent delegate if possible,
    // but the direct input selection is simplest if they exist.

    // Re-select inputs every time activeSectionId changes might help if they are conditionally rendered?
    // But sections are hidden with css (display:none) usually, not unmounted.
    // Let's check how sections are rendered. They seem to be all rendered but hidden.

    const summaryTitleInput = root.querySelector<HTMLInputElement>(
      '[data-section-id="project-summary"] input[placeholder="Enter project title"]',
    );
    const trainingTitleInput = root.querySelector<HTMLInputElement>(
      '[data-section-id="training-design"] input[placeholder="Enter project title"]',
    );

    if (!summaryTitleInput || !trainingTitleInput) return;

    const syncTitle = () => {
      // Only sync if the target is empty or we want to overwrite it always?
      // Usually one-way sync from summary to training design is expected.
      if (trainingTitleInput.value !== summaryTitleInput.value) {
        trainingTitleInput.value = summaryTitleInput.value;
        // Dispatch input event so React/other listeners know it changed if needed
        trainingTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    // Sync immediately
    syncTitle();

    // Listen for changes
    summaryTitleInput.addEventListener('input', syncTitle);
    summaryTitleInput.addEventListener('change', syncTitle);
    summaryTitleInput.addEventListener('blur', syncTitle);

    return () => {
      summaryTitleInput.removeEventListener('input', syncTitle);
      summaryTitleInput.removeEventListener('change', syncTitle);
      summaryTitleInput.removeEventListener('blur', syncTitle);
    };
  }, [panelVisible, activeSectionId]); // Added activeSectionId to re-attach if DOM changes

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

  useEffect(() => {
    if (!panelRef.current) return;
    if (!panelVisible) return;
    if (!viewProjectData) return;
    if (!(panelMode === 'review' || panelMode === 'edit')) return;

    let timeoutId: number;

    const restore = () => {
      try {
        const proposal: any = (viewProjectData as any).proposalData;
        if (!proposal || typeof proposal !== 'object') return;

        // 1. Restore row counts from HTML structure to ensure React renders enough rows
        // We use a temporary container to parse the saved HTML structure without injecting it yet
        const tempDiv = document.createElement('div');
        
        if (proposal['rationale']?.htmlContent) {
          tempDiv.innerHTML = proposal['rationale'].htmlContent;
          const rows = tempDiv.querySelectorAll('table tbody tr');
          if (rows.length > 0) setFgdRowCount(rows.length);
        }

        if (proposal['implementation-plan']?.htmlContent) {
          tempDiv.innerHTML = proposal['implementation-plan'].htmlContent;
          const rows = tempDiv.querySelectorAll('table tbody tr');
          if (rows.length > 0) setImplementationRowCount(rows.length);
        }

        if (proposal['budgetary-requirement']?.htmlContent) {
          tempDiv.innerHTML = proposal['budgetary-requirement'].htmlContent;
          const tables = tempDiv.querySelectorAll('table');
          // Table 1: Training Expenses
          if (tables[0]) {
            const rows = tables[0].querySelectorAll('tbody tr');
            // Subtract 1 for the subtotal row
            if (rows.length > 1) setTrainingExpensesRowCount(rows.length - 1);
          }
          // Table 2: Office Supplies
          if (tables[1]) {
            const rows = tables[1].querySelectorAll('tbody tr');
            // Subtract 1 for the subtotal row
            if (rows.length > 1) setOfficeSuppliesRowCount(rows.length - 1);
          }
          // Table 3: Other Expenses
          if (tables[2]) {
            const rows = tables[2].querySelectorAll('tbody tr');
            // Subtract 1 for the subtotal row
            if (rows.length > 1) setOtherExpensesRowCount(rows.length - 1);
          }
        }

        if (proposal['training-design']?.htmlContent) {
          tempDiv.innerHTML = proposal['training-design'].htmlContent;
          const rows = tempDiv.querySelectorAll('table tbody tr');
          // Subtract 1 for the total hours row
          if (rows.length > 1) setTrainingDesignRowCount(rows.length - 1);
        }

        // 2. Wait for React to re-render with the new row counts, then populate values
        // We use a small timeout to allow the state updates to flush to the DOM
        timeoutId = window.setTimeout(() => {
          if (!panelRef.current) return;

          for (const section of proposalSections) {
            const snapshot = proposal[section.id];
            const container = panelRef.current.querySelector<HTMLElement>(
              `[data-section-id="${section.id}"]`,
            );
            
            if (!container || !snapshot) continue;

            // Restore input values
            if (Array.isArray(snapshot.inputs)) {
              const liveInputs = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
              snapshot.inputs.forEach((savedInput: any) => {
                const liveEl = liveInputs[savedInput.index];
                if (liveEl) {
                  if (savedInput.type === 'checkbox') {
                    (liveEl as HTMLInputElement).checked = !!savedInput.checked;
                  } else {
                    liveEl.value = savedInput.value ?? '';
                    // For budget inputs, we need to trigger the calculation logic
                    // The inputs in budget tables have onChange handlers that update state
                    if (
                      section.id === 'budgetary-requirement' || 
                      (section.id === 'training-design' && savedInput.type === 'number')
                    ) {
                      liveEl.dispatchEvent(new Event('input', { bubbles: true }));
                      // Also dispatch change just in case
                      liveEl.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }
                }
              });
            }

            // Restore editable cells
            if (Array.isArray(snapshot.editableCells)) {
              const liveCells = container.querySelectorAll<HTMLElement>('[contenteditable="true"]');
              snapshot.editableCells.forEach((content: string, index: number) => {
                const liveEl = liveCells[index];
                if (liveEl) {
                  liveEl.innerText = content;
                }
              });
            }
          }
        }, 50);

      } catch (err) {
        // ignore hydration errors
        console.error('Hydration error', err);
      }
    };

    restore();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [viewProjectData, panelVisible, panelMode]); // Removed proposalSections dependency to avoid infinite loops

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

  const handleSaveProposal = async (action: 'draft' | 'submit') => {
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

      const isEdit = panelMode === 'edit' && viewProjectId;
      const isDraft = action === 'draft';
      const wantsSubmit = action === 'submit';
      const url = isEdit
        ? `http://localhost:5000/api/projects/${encodeURIComponent(viewProjectId as string)}`
        : 'http://localhost:5000/api/projects';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: 'Extension project proposal',
          projectLeaderId,
          sections: sectionsSnapshot,
          totals: {
            trainingExpensesSubtotal,
            officeSuppliesSubtotal,
            otherExpensesSubtotal,
            totalBudgetaryRequirements,
            trainingDesignHoursTotal,
          },
          isDraft,
          // When submitting an existing draft, explicitly mark as submitted
          ...(isEdit && wantsSubmit ? { markSubmitted: true } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save project proposal');
      }

      const createdProject = (await response.json()) as LeaderProject;

      setSaveMessage(
        isDraft
          ? isEdit
            ? 'Proposal saved as draft.'
            : 'Proposal created as draft.'
          : isEdit
          ? 'Project submitted successfully.'
          : 'Project created and submitted successfully.',
      );
      setViewProjectId(null);
      setViewProjectData(null);

      // Close the builder panel after a successful submit
      setPanelVisible(false);
      setTimeout(() => setPanelMounted(false), transitionMs);

      // Only show the "submitted" success modal when action was submit
      if (wantsSubmit) {
        setShowSubmitSuccess(true);
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
    setTimeout(() => {
      setPanelMounted(false);
      // Remove URL params when closing the panel to allow re-opening the same project
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('highlightProjectId');
      newUrl.searchParams.delete('openPanel');
      newUrl.searchParams.delete('section');
      window.history.replaceState({}, '', newUrl.toString());
    }, transitionMs);
  };

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
                <button
                  onClick={openCreatePanel}
                  className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-yellow-600"
                >
                  <PlusCircle className="h-4 w-4" />
                  New Project
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Your projects</h2>
                  <p className="text-xs text-gray-500">
                    Recently saved proposals appear here so you can review or continue editing.
                  </p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Proposal projects</h3>
                  <div className="space-y-3">
                    {upcomingLeaderProjects.length === 0 ? (
                      <p className="text-xs text-gray-600">No proposal projects.</p>
                    ) : (
                      upcomingLeaderProjects.map((project) => renderProjectCard(project))
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Submitted projects</h3>
                  <div className="space-y-3">
                    {ongoingLeaderProjects.length === 0 ? (
                      <p className="text-xs text-gray-600">No approved projects.</p>
                    ) : (
                      ongoingLeaderProjects.map((project) => renderProjectCard(project))
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Completed / Ended projects</h3>
                  <div className="space-y-3">
                    {completedLeaderProjects.length === 0 ? (
                      <p className="text-xs text-gray-600">No completed or ended projects.</p>
                    ) : (
                      completedLeaderProjects.map((project) => renderProjectCard(project))
                    )}
                  </div>
                </div>
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
              transition: `transform ${transitionMs}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
              willChange: 'transform',
            }}
          >
            <div className="flex items-center justify-between border-b border-yellow-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Project Leader Workspace</p>
                <h2 className="text-lg font-semibold text-gray-900">Project</h2>
              </div>
              <div className="flex items-center gap-2">
                {saveError ? (
                  <span className="text-xs font-medium text-red-600">{saveError}</span>
                ) : saveMessage ? (
                  <span className="text-xs font-medium text-green-600">{saveMessage}</span>
                ) : null}
                {panelMode === 'create' || panelMode === 'edit' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveProposal('draft')}
                      disabled={isSaving}
                      className="rounded-full border border-yellow-300 bg-white px-3 py-1 text-sm font-semibold text-yellow-700 shadow-sm hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSaving ? 'Saving…' : 'Save as proposal'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveProposal('submit')}
                      disabled={isSaving}
                      className="rounded-full bg-yellow-500 px-3 py-1 text-sm font-semibold text-white shadow hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSaving ? 'Submitting…' : 'Submit project'}
                    </button>
                  </div>
                ) : null}
                {panelMode === 'review' &&
                  // Only allow editing if the project is NOT submitted (i.e., it's a Draft)
                  (projects.find((p) => p._id === viewProjectId)?.isSubmitted !== true) && (
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

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSectionId('applicants-section');
                      if (viewProjectId) {
                        fetchApplicantsForProject(viewProjectId);
                      }
                    }}
                    className={`mt-2 block w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                      activeSectionId === 'applicants-section'
                        ? 'bg-yellow-500 text-white shadow'
                        : 'bg-white text-yellow-800 hover:bg-yellow-100'
                    }`}
                  >
                    Applicants
                  </button>
                </nav>
              </aside>
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8" data-panel-content="true">
                <div className="mx-auto w-full max-w-6xl space-y-6">
                  {activeSectionId !== 'applicants-section' && (
                    <>
                      <div className="rounded-xl border border-yellow-100 bg-yellow-50/60 p-4 text-xs text-yellow-800">
                        <p className="font-semibold uppercase tracking-wide">Reminder</p>
                        <p>
                          Fill out each section completely. Required subsections and tables are provided to mirror the
                          instructor-approved template.
                        </p>
                      </div>
                      <div
                        className={`space-y-5 text-sm text-gray-700 ${
                          panelMode === 'review' ? 'pointer-events-none opacity-75' : ''
                        }`}
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
                    </>
                  )}

                  {activeSectionId === 'applicants-section' && (
                    <section
                      className="space-y-3 rounded-xl border border-yellow-100 bg-white p-4 text-xs text-gray-800"
                      data-section-id="applicants-section"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Applicants</h3>
                          <p className="text-[11px] text-gray-600">
                            Review join requests and approved participants for this project.
                          </p>
                        </div>
                        {currentPanelProjectStatus === 'Approved' && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Manage enabled
                          </span>
                        )}
                      </div>

                      {applicantsLoading ? (
                        <p className="text-[11px] text-gray-600">Loading applicants…</p>
                      ) : applicantsError ? (
                        <p className="text-[11px] font-medium text-red-600">{applicantsError}</p>
                      ) : applicants.length === 0 ? (
                        <p className="text-[11px] text-gray-500">
                          No applicants found for this project yet. New join requests will appear here.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-yellow-100 bg-yellow-50/50">
                          <table className="min-w-full text-left text-[11px]">
                            <thead className="bg-yellow-50 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                              <tr>
                                <th className="px-3 py-2">Name</th>
                                <th className="px-3 py-2">Participant email</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Joined / Requested at</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {applicants.map((row) => (
                                <tr key={row.id} className="border-t border-yellow-100 bg-white/80">
                                  <td className="px-3 py-2 align-top text-[11px] text-gray-900">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedApplicant(row);
                                        setApplicantProfileOpen(true);
                                      }}
                                      className="max-w-xs truncate text-left font-semibold text-yellow-800 hover:underline"
                                    >
                                      {row.fullName || row.email}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 align-top text-[11px] text-gray-900">{row.email}</td>
                                  <td className="px-3 py-2 align-top text-[11px]">
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                        row.status === 'Approved'
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                          : 'border-amber-200 bg-amber-50 text-amber-700'
                                      }`}
                                    >
                                      {row.status === 'Approved' ? 'Approved' : 'Pending approval'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 align-top text-[11px] text-gray-600">{row.createdAtLabel}</td>
                                  <td className="px-3 py-2 align-top text-right">
                                    {currentPanelProjectStatus === 'Approved' && viewProjectId ? (
                                      row.status === 'Pending' ? (
                                        <div className="inline-flex flex-wrap justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedApplicant(row);
                                              setApplicantProfileOpen(true);
                                            }}
                                            className="rounded-full border border-yellow-200 px-2 py-0.5 text-[10px] font-semibold text-yellow-700 hover:bg-yellow-50"
                                          >
                                            View profile
                                          </button>
                                          <button
                                            type="button"
                                            disabled={applicantRespondingId === row.email}
                                            onClick={() =>
                                              handleApplicantDecision(viewProjectId, row.email, 'approved')
                                            }
                                            className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            type="button"
                                            disabled={applicantRespondingId === row.email}
                                            onClick={() =>
                                              handleApplicantDecision(viewProjectId, row.email, 'declined')
                                            }
                                            className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="inline-flex flex-wrap justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedApplicant(row);
                                              setApplicantProfileOpen(true);
                                            }}
                                            className="rounded-full border border-yellow-200 px-2 py-0.5 text-[10px] font-semibold text-yellow-700 hover:bg-yellow-50"
                                          >
                                            View profile
                                          </button>
                                          <button
                                            type="button"
                                            disabled={applicantRespondingId === row.email}
                                            onClick={() => handleRemoveApprovedApplicant(viewProjectId, row.email)}
                                            className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      )
                                    ) : (
                                      <span className="text-[10px] text-gray-500">
                                        Actions are disabled for this project status.
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  )}
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
                        if (currentPanelProjectStatus === 'Approved') {
                          return;
                        }
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

      {applicantProfileOpen && selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border border-yellow-100 bg-white p-7 text-sm text-gray-800 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-xs font-semibold uppercase text-yellow-800">
                  {(selectedApplicant.fullName || selectedApplicant.email)
                    .split(' ')
                    .map((part) => part.trim()[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-yellow-500">Applicant profile</p>
                  <h3 className="mt-1 text-base font-semibold text-gray-900 break-words">
                    {selectedApplicant.fullName || selectedApplicant.email}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-gray-500 break-all">{selectedApplicant.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApplicantProfileOpen(false)}
                className="rounded-full border border-yellow-200 px-3 py-0.5 text-[11px] font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 rounded-2xl bg-yellow-50/60 p-4 text-[11px] text-gray-700">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Status</p>
                  <p className="text-[11px] text-gray-800">Current application status</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    selectedApplicant.status === 'Approved'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {selectedApplicant.status === 'Approved' ? 'Approved' : 'Pending approval'}
                </span>
              </div>

              <div className="border-t border-yellow-100 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Joined / requested at</p>
                <p className="mt-0.5 text-[11px] font-medium text-gray-800">{selectedApplicant.createdAtLabel || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {extensionModalOpen && activitiesModalProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-4xl rounded-2xl border border-yellow-100 bg-white p-6 text-sm text-gray-800 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-yellow-500">Extension activities</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900 line-clamp-1">
                  {activitiesModalProject.name}
                </h3>
                <p className="mt-1 text-[11px] text-gray-500">
                  Define or update extension activities (topics, hours, and resource persons) for this project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExtensionModalOpen(false)}
                className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              {extensionError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                  {extensionError}
                </p>
              )}

              <div className="grid gap-4 md:grid-cols-1">
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-900">
                  Project Title
                  <input className={inputClassName} value={activitiesModalProject.name} readOnly />
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
                    {extensionRows.map((row, index) => (
                      <tr key={index}>
                        <td className={tableCellClassName}>
                          <input
                            type="text"
                            className="w-full border-none bg-transparent text-sm text-gray-900 focus:outline-none focus:ring-0"
                            value={row.topic}
                            onChange={(event) => {
                              const value = event.target.value;
                              setExtensionRows((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], topic: value };
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className={tableCellClassName}>
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            className="w-full border-none bg-transparent text-sm text-gray-900 focus:outline-none focus:ring-0"
                            value={row.hours}
                            onChange={(event) => {
                              const value = event.target.value;
                              setExtensionRows((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], hours: value };
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className={tableCellClassName}>
                          <input
                            type="text"
                            className="w-full border-none bg-transparent text-sm text-gray-900 focus:outline-none focus:ring-0"
                            value={row.resourcePerson}
                            onChange={(event) => {
                              const value = event.target.value;
                              setExtensionRows((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], resourcePerson: value };
                                return next;
                              });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className={`font-semibold text-gray-900 ${tableCellClassName}`}>Total Hours</td>
                      <td className={`font-semibold text-gray-900 ${tableCellClassName}`}>
                        {(() => {
                          const sum = extensionRows.reduce((acc, row) => {
                            const val = parseFloat(row.hours);
                            return acc + (Number.isFinite(val) ? val : 0);
                          }, 0);
                          return sum > 0 ? sum.toString() : '';
                        })()}
                      </td>
                      <td className={tableCellClassName}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setExtensionRows((prev) => [...prev, { topic: '', hours: '', resourcePerson: '' }])
                  }
                  className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                >
                  Add row
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExtensionRows((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
                  }
                  className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 transition hover:bg-yellow-50"
                >
                  Delete row
                </button>
              </div>

              <div className="mt-4 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setExtensionModalOpen(false)}
                  className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 hover:bg-yellow-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveExtensionActivities}
                  disabled={extensionSaving}
                  className="rounded-full bg-yellow-500 px-3 py-1 font-semibold text-white shadow hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {extensionSaving ? 'Saving…' : 'Save activities'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activitiesModalOpen && activitiesModalProject && (
        <div
          className="fixed inset-0 z-40 flex bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            style={{
              transform: activitiesModalOpen ? 'translateX(0%)' : 'translateX(100%)',
              transition: 'transform 280ms cubic-bezier(0.22, 0.61, 0.36, 1)',
            }}
          >
            <div className="flex items-center justify-between border-b border-yellow-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Project Activities</p>
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{activitiesModalProject.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedProjectIsCompleted) {
                      openTerminalReportForCurrentProject();
                    } else {
                      openExtensionActivitiesModal();
                    }
                  }}
                  className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
                >
                  {selectedProjectIsCompleted ? 'Terminal reports' : 'Add / extend activities'}
                </button>
                <button
                  type="button"
                  onClick={() => setActivitiesModalOpen(false)}
                  className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 text-xs text-gray-800">
              {activitiesForModal.length === 0 ? (
                <p className="text-xs text-gray-600">
                  No activities have been defined yet in the Training Design section for this project.
                </p>
              ) : (
                <div className="space-y-3">
                  {activitiesForModal.map((activity, index) => {
                    const isHighlighted =
                      !!highlightedProjectActivity &&
                      activitiesModalProject._id === highlightedProjectActivity.projectId &&
                      activity.title === highlightedProjectActivity.activityTitle;

                    const scheduleKey = `${activitiesModalProject._id}:${activity.activityId}`;
                    const draft = activityScheduleDrafts[scheduleKey];
                    const startValue = draft?.startAt ?? toDateTimeLocalValue(activity.startAt);
                    const endValue = draft?.endAt ?? toDateTimeLocalValue(activity.endAt);

                    const hasStart = !!startValue;
                    const hasEnd = !!endValue;

                    const now = nowMs;
                    const startDate = activity.startAt ? new Date(activity.startAt) : undefined;
                    const endDate = activity.endAt ? new Date(activity.endAt) : undefined;

                    const hasValidStart = !!startDate && !Number.isNaN(startDate.getTime());
                    const hasValidEnd = !!endDate && !Number.isNaN(endDate.getTime());

                    const isExpired = hasValidEnd && endDate!.getTime() < now;
                    const isOngoing =
                      hasValidStart && hasValidEnd && startDate!.getTime() <= now && now <= endDate!.getTime();
                    const isUpcoming = hasValidStart && !isOngoing && !isExpired && startDate!.getTime() > now;

                    return (
                      <div
                        key={`${activity.title}-${index}`}
                        onClick={() => {
                          openAttendanceView(activity);
                        }}
                        className={`cursor-pointer rounded-xl border border-yellow-100 bg-yellow-50/40 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                          isHighlighted ? 'ring-2 ring-yellow-400 animate-pulse' : ''
                        } ${isExpired ? 'opacity-60' : ''}`}
                      >
                        <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <span>{activity.title}</span>
                          {isHighlighted && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 animate-pulse">
                              New
                            </span>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-gray-700">
                          {activity.resourcePerson && (
                            <span className="rounded-full bg-white px-2 py-0.5 font-medium text-gray-700">
                              Resource: {activity.resourcePerson}
                            </span>
                          )}
                          {(hasStart || hasEnd) && (
                            <span className="rounded-full bg-white px-2 py-0.5 font-medium text-gray-700">
                              {hasStart && startValue && (
                                <>
                                  Start:{' '}
                                  {new Date(startValue).toLocaleString('en-PH', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </>
                              )}
                              {hasEnd && endValue && (
                                <>
                                  {hasStart ? ' · ' : ''}
                                  End:{' '}
                                  {new Date(endValue).toLocaleString('en-PH', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </>
                              )}
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-600">
                              Upcoming
                            </span>
                          )}
                          {isOngoing && (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600">
                              Ongoing
                            </span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-600">
                              Ended
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {terminalReportOpen && activitiesModalProject && (
        <div
          className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto my-8 flex h-[calc(100%-4rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-yellow-100 px-6 py-4">
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-yellow-500">Terminal report</p>
                <h2 className="text-base font-semibold text-gray-900 line-clamp-1">{activitiesModalProject.name}</h2>
                <p className="text-[11px] text-gray-500">Summary of attendance across all completed activities for this project.</p>
              </div>
              <button
                type="button"
                onClick={() => setTerminalReportOpen(false)}
                className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 text-xs text-gray-800 bg-gradient-to-b from-yellow-50/40 via-white to-white">
              {terminalReportLoading && (
                <p className="text-xs text-gray-600">Loading terminal report…</p>
              )}
              {!terminalReportLoading && terminalReportError && (
                <p className="text-xs text-red-600">{terminalReportError}</p>
              )}
              {!terminalReportLoading && !terminalReportError && terminalReportTotals && (
                <div className="space-y-6">
                  <section className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Overall summary</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-yellow-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Ended activities</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{terminalReportTotals.totalActivities}</p>
                      </div>
                      <div className="rounded-xl border border-yellow-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Total registrations</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{terminalReportTotals.totalRegistrations}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Present</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-900">{terminalReportTotals.present}</p>
                      </div>
                      <div className="rounded-xl border border-red-100 bg-red-50/70 px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Absent</p>
                        <p className="mt-1 text-2xl font-bold text-red-900">{terminalReportTotals.absent}</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Attendance coverage</p>
                    <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
                      <div className="space-y-2">
                        <p className="text-[11px] text-gray-600">
                          Distribution of beneficiaries across present, absent, and never appeared in attendance.
                        </p>
                        {(() => {
                          const totalOverall =
                            terminalReportTotals.present +
                              terminalReportTotals.absent +
                              terminalReportTotals.notOnAttendance || 1;
                          const presentPct = (terminalReportTotals.present / totalOverall) * 100;
                          const absentPct = (terminalReportTotals.absent / totalOverall) * 100;
                          const noaPct = (terminalReportTotals.notOnAttendance / totalOverall) * 100;
                          return (
                            <div className="overflow-hidden rounded-full border border-yellow-100 bg-gray-100">
                              <div className="flex h-4 w-full">
                                <div
                                  className="h-4 bg-emerald-500/85"
                                  style={{ width: `${presentPct}%` }}
                                  title={`Present ${terminalReportTotals.present}`}
                                />
                                <div
                                  className="h-4 bg-red-400/85"
                                  style={{ width: `${absentPct}%` }}
                                  title={`Absent ${terminalReportTotals.absent}`}
                                />
                                <div
                                  className="h-4 bg-gray-400/80"
                                  style={{ width: `${noaPct}%` }}
                                  title={`Not on attendance ${terminalReportTotals.notOnAttendance}`}
                                />
                              </div>
                            </div>
                          );
                        })()}
                        <div className="flex flex-wrap gap-4 text-[11px] text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/85" /> Present
                            <span className="text-[10px] text-gray-500">({terminalReportTotals.present})</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-full bg-red-400/85" /> Absent
                            <span className="text-[10px] text-gray-500">({terminalReportTotals.absent})</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-full bg-gray-400/80" /> Not on attendance
                            <span className="text-[10px] text-gray-500">
                              ({terminalReportTotals.notOnAttendance})
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-yellow-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Quick ratios</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {(() => {
                            const totalOverall =
                              terminalReportTotals.present +
                                terminalReportTotals.absent +
                                terminalReportTotals.notOnAttendance || 1;
                            const presentPct = Math.round((terminalReportTotals.present / totalOverall) * 100);
                            const absentPct = Math.round((terminalReportTotals.absent / totalOverall) * 100);
                            const noaPct = Math.round((terminalReportTotals.notOnAttendance / totalOverall) * 100);
                            return (
                              <>
                                <div className="space-y-0.5">
                                  <p className="text-[11px] text-gray-500">Present rate</p>
                                  <p className="text-sm font-semibold text-emerald-700">{presentPct}%</p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[11px] text-gray-500">Absent rate</p>
                                  <p className="text-sm font-semibold text-red-700">{absentPct}%</p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[11px] text-gray-500">Not on attendance</p>
                                  <p className="text-sm font-semibold text-gray-800">{noaPct}%</p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </section>

                  {terminalReportTotals.activities.length > 0 && (
                    <section className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">By activity</p>
                      <div className="overflow-x-auto rounded-xl border border-yellow-100 bg-white">
                        <table className="min-w-full border-collapse text-[11px] text-gray-800">
                          <thead>
                            <tr className="bg-yellow-50 text-gray-700">
                              <th className="border-b border-yellow-100 px-3 py-2 text-left font-semibold">Activity</th>
                              <th className="border-b border-yellow-100 px-3 py-2 text-right font-semibold">Present</th>
                              <th className="border-b border-yellow-100 px-3 py-2 text-right font-semibold">Absent</th>
                              <th className="border-b border-yellow-100 px-3 py-2 text-right font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {terminalReportTotals.activities.map((row, index) => (
                              <tr
                                key={`${row.title}-${index}`}
                                className={index % 2 === 0 ? 'bg-white' : 'bg-yellow-50/40'}
                              >
                                <td className="px-3 py-2 text-left align-top">
                                  <span className="line-clamp-2 text-[11px] font-medium text-gray-900">{row.title}</span>
                                </td>
                                <td className="px-3 py-2 text-right align-top text-emerald-700 font-semibold">{row.present}</td>
                                <td className="px-3 py-2 text-right align-top text-red-700 font-semibold">{row.absent}</td>
                                <td className="px-3 py-2 text-right align-top font-semibold text-gray-900">{row.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {attendanceViewOpen && attendanceActivity && activitiesModalProject && (
        <div
          className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto my-8 flex h-[calc(100%-4rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-yellow-100 px-6 py-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Activity Attendance</p>
                <h2 className="text-sm font-semibold text-gray-900 line-clamp-1">{attendanceActivity.title}</h2>
                <p className="text-[11px] text-gray-500 line-clamp-1">Project: {activitiesModalProject.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setAttendanceViewOpen(false)}
                className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 text-xs text-gray-800">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Summary</p>
                  <p className="text-xs text-gray-700">
                    Use this view to track which beneficiaries attended this activity once they register and are approved.
                  </p>
                </div>
                <div className="flex flex-1 flex-col items-stretch gap-1 text-[11px] md:flex-none md:items-end">
                  {activitiesModalProject && (
                    (() => {
                      const scheduleKey = `${activitiesModalProject._id}:${attendanceActivity.activityId}`;
                      const draft = activityScheduleDrafts[scheduleKey];
                      const startValue = draft?.startAt ?? toDateTimeLocalValue(attendanceActivity.startAt);
                      const endValue = draft?.endAt ?? toDateTimeLocalValue(attendanceActivity.endAt);
                      const locationValue =
                        draft?.location ?? (typeof attendanceActivity.location === 'string' ? attendanceActivity.location : '');

                      const hasStart = !!startValue;
                      const hasEnd = !!endValue;

                      const now = nowMs;
                      const startDate = attendanceActivity.startAt
                        ? new Date(attendanceActivity.startAt)
                        : undefined;
                      const endDate = attendanceActivity.endAt
                        ? new Date(attendanceActivity.endAt)
                        : undefined;

                      const hasValidStart = !!startDate && !Number.isNaN(startDate.getTime());
                      const hasValidEnd = !!endDate && !Number.isNaN(endDate.getTime());

                      const isExpired = hasValidEnd && endDate!.getTime() < now;
                      const isOngoing =
                        hasValidStart && hasValidEnd && startDate!.getTime() <= now && now <= endDate!.getTime();
                      const isUpcoming = hasValidStart && !isOngoing && !isExpired && startDate!.getTime() > now;

                      return (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-gray-600">Schedule & location:</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="flex items-center gap-1">
                                <span className="text-gray-600">Start</span>
                                <input
                                  type="datetime-local"
                                  value={startValue}
                                  disabled={isExpired}
                                  onChange={(e) => {
                                    if (isExpired) return;
                                    const value = e.target.value;
                                    setActivityScheduleDrafts((prev) => ({
                                      ...prev,
                                      [scheduleKey]: {
                                        startAt: value,
                                        endAt: prev[scheduleKey]?.endAt ?? (endValue || ''),
                                        location: prev[scheduleKey]?.location ?? locationValue,
                                      },
                                    }));
                                  }}
                                  className="rounded border border-yellow-200 px-2 py-1 text-[11px] text-gray-800 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-300"
                                />
                              </label>
                              <label className="flex items-center gap-1">
                                <span className="text-gray-600">End</span>
                                <input
                                  type="datetime-local"
                                  value={endValue}
                                  disabled={isExpired}
                                  onChange={(e) => {
                                    if (isExpired) return;
                                    const value = e.target.value;
                                    setActivityScheduleDrafts((prev) => ({
                                      ...prev,
                                      [scheduleKey]: {
                                        startAt: prev[scheduleKey]?.startAt ?? (startValue || ''),
                                        endAt: value,
                                        location: prev[scheduleKey]?.location ?? locationValue,
                                      },
                                    }));
                                  }}
                                  className="rounded border border-yellow-200 px-2 py-1 text-[11px] text-gray-800 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-300"
                                />
                              </label>
                              <label className="flex items-center gap-1">
                                <span className="text-gray-600">Location</span>
                                <input
                                  type="text"
                                  value={locationValue}
                                  disabled={isExpired}
                                  onChange={(e) => {
                                    if (isExpired) return;
                                    const value = e.target.value;
                                    setActivityScheduleDrafts((prev) => ({
                                      ...prev,
                                      [scheduleKey]: {
                                        startAt: prev[scheduleKey]?.startAt ?? (startValue || ''),
                                        endAt: prev[scheduleKey]?.endAt ?? (endValue || ''),
                                        location: value,
                                      },
                                    }));
                                  }}
                                  className="w-40 rounded border border-yellow-200 px-2 py-1 text-[11px] text-gray-800 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-300"
                                  placeholder="e.g. AVR, Room 101"
                                />
                              </label>
                              <button
                                type="button"
                                disabled={activityScheduleSavingKey === scheduleKey || isExpired}
                                onClick={() =>
                                  handleSaveActivitySchedule(
                                    activitiesModalProject._id,
                                    attendanceActivity,
                                    startValue,
                                    endValue,
                                    locationValue,
                                  )
                                }
                                className="rounded-full border border-yellow-300 px-3 py-1 text-[11px] font-semibold text-yellow-700 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {activityScheduleSavingKey === scheduleKey ? 'Saving…' : 'Save schedule'}
                              </button>
                            </div>
                          </div>
                          {activityScheduleError && (
                            <p className="text-[11px] text-red-600">{activityScheduleError}</p>
                          )}
                          {(hasStart || hasEnd || (attendanceActivity.location && attendanceActivity.location.trim())) && (
                            <p className="text-[11px] text-gray-600">
                              {hasStart && startValue && (
                                <>
                                  Start:{' '}
                                  {new Date(startValue).toLocaleString('en-PH', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </>
                              )}
                              {hasEnd && endValue && (
                                <>
                                  {hasStart ? ' · ' : ''}
                                  End:{' '}
                                  {new Date(endValue).toLocaleString('en-PH', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </>
                              )}
                              {attendanceActivity.location && attendanceActivity.location.trim() && (
                                <>
                                  {(hasStart || hasEnd) ? ' · ' : ''}
                                  Location: {attendanceActivity.location.trim()}
                                </>
                              )}
                              {isExpired && ' · Expired'}
                            </p>
                          )}
                          {(isUpcoming || isOngoing || isExpired) && (
                            <p className="mt-1 flex flex-wrap gap-2 text-[11px]">
                              {isUpcoming && (
                                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-600">
                                  Upcoming
                                </span>
                              )}
                              {isOngoing && (
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600">
                                  Ongoing
                                </span>
                              )}
                              {isExpired && (
                                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-600">
                                  Ended
                                </span>
                              )}
                            </p>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-700">
                  <span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 font-semibold text-yellow-700">
                    Planned resource: {attendanceActivity.resourcePerson || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">Participants</h3>
                  <span className="text-[11px] text-gray-500">
                    Manage attendance for participants who joined this activity.
                  </span>
                </div>

                {attendanceLoading ? (
                  <p className="text-xs text-gray-600">Loading registrations...</p>
                ) : attendanceError ? (
                  <p className="text-xs text-red-600">{attendanceError}</p>
                ) : attendanceRows.length === 0 ? (
                  <p className="text-xs text-gray-600">No participants have joined this activity yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-yellow-100 bg-yellow-50/40">
                    <table className="min-w-full text-left text-xs text-gray-800">
                      <thead className="bg-yellow-50 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                        <tr>
                          <th className="px-3 py-2">Participant</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Actions</th>
                          <th className="px-3 py-2">Last updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRows.map((row) => {
                          const displayName = row.fullName && row.fullName !== row.participantEmail
                            ? `${row.fullName} (${row.participantEmail})`
                            : row.participantEmail;
                          return (
                          <tr key={row.participantEmail} className="border-t border-yellow-100">
                            <td className="px-3 py-2 text-xs font-medium text-gray-900">{displayName}</td>
                            <td className="px-3 py-2 text-xs text-gray-700 capitalize">{row.status}</td>
                            <td className="px-3 py-2 text-xs">
                              <div className="flex flex-wrap items-center gap-1">
                                <button
                                  type="button"
                                  disabled={
                                    attendanceUpdatingEmail === row.participantEmail ||
                                    row.status !== 'registered' ||
                                    !canEditAttendance
                                  }
                                  onClick={() => handleAttendanceUpdate(row.participantEmail, 'present')}
                                  className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Mark present
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    attendanceUpdatingEmail === row.participantEmail ||
                                    row.status !== 'registered' ||
                                    !canEditAttendance
                                  }
                                  onClick={() => handleAttendanceUpdate(row.participantEmail, 'absent')}
                                  className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Mark absent
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-[10px] text-gray-500">
                              {row.updatedAt
                                ? new Date(row.updatedAt).toLocaleString('en-PH', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                                : ''}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
