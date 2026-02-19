"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { io, type Socket } from "socket.io-client";
import { useSearchParams } from "next/navigation";

interface AdminProject {
  _id: string;
  name: string;
  description: string;
  status?: "Pending" | "Approved" | "Rejected" | string;
  activitySchedule?: Array<{
    activityId?: number;
    startAt?: string;
    endAt?: string;
  }>;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60000); // Update every minute

    return () => {
      window.clearInterval(id);
    };
  }, []);

  const [viewerMounted, setViewerMounted] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerProject, setViewerProject] = useState<AdminProject | null>(null);
  const [viewerData, setViewerData] = useState<any | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('project-summary');
  const [evaluateMounted, setEvaluateMounted] = useState(false);
  const [evaluateVisible, setEvaluateVisible] = useState(false);
  const [beneficiariesOpen, setBeneficiariesOpen] = useState(false);
  const [beneficiariesProject, setBeneficiariesProject] = useState<AdminProject | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<
    Array<{ email: string; status: 'active' | 'removed'; joinedAt?: string; updatedAt?: string; fullName?: string }>
  >([]);
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(false);
  const [beneficiariesError, setBeneficiariesError] = useState<string | null>(null);

  const [evaluationTitle, setEvaluationTitle] = useState('');
  const [evaluationCampus, setEvaluationCampus] = useState('');
  const [evaluationRatings, setEvaluationRatings] = useState<number[]>([]);
  const [evaluationRowRemarks, setEvaluationRowRemarks] = useState<string[]>([]);
  const [evaluationOverallComments, setEvaluationOverallComments] = useState('');
  const [evaluationExtensionRemarks, setEvaluationExtensionRemarks] = useState('');
  const [evaluationExtensionRevised, setEvaluationExtensionRevised] = useState(false);
  const [evaluationExtensionDeferred, setEvaluationExtensionDeferred] = useState(false);
  const [evaluationSaving, setEvaluationSaving] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportPreviewKind, setExportPreviewKind] = useState<'summary' | 'beneficiaries' | null>(null);

  const viewerRootRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const searchParams = useSearchParams();
  const highlightProjectId = searchParams.get('highlightProjectId');

  const viewerSections: Array<{ id: string; label: string }> = [
    { id: 'project-summary', label: 'I. Project Summary' },
    { id: 'rationale', label: 'II. Rationale of the Project' },
    { id: 'goals-objectives', label: 'III. Goals, Objectives & Intended Outcomes' },
    { id: 'implementation-plan', label: 'IV. Implementation Plan' },
    { id: 'monitoring-evaluation', label: 'V. Monitoring & Evaluation Plan' },
    { id: 'organizational-capability', label: 'VI. Organizational Capability' },
    { id: 'community-extension-team', label: 'VII. Community Extension Team' },
    { id: 'sustainability-plan', label: 'VIII. Sustainability Plan' },
    { id: 'budgetary-requirement', label: 'IX. Budgetary Requirement' },
    { id: 'training-design', label: 'X. Training Design' },
  ];

  const evaluationCriteria: Array<{ label: string }> = [
    { label: 'I. Project Evaluation of the Previous Phase' },
    { label: 'II. Rationale for Phase 2 and Above Proposals' },
    { label: 'III. The project is relevant to the goals and objectives' },
    { label: 'IV. The beneficiary of the project is clearly described' },
    { label: 'V. The proposed intervention (extension project) is a response to the beneficiaries\' needs' },
    { label: 'VI. The objectives are SMART; the goals and outcomes are logical' },
    { label: 'VII. The Implementation Plan is logical and complete' },
    { label: 'VIII. The Monitoring and Evaluation Plan shows a clear strategy' },
    { label: 'IX. The Extension Team is complete; roles and responsibilities are clearly defined' },
    { label: 'X. The Sustainability Plan is detailed, well thought out, and realistic' },
    { label: 'XI. The Budgetary Requirement is reasonable' },
    { label: 'XII. Over-all impression (The project is worth conducting.)' },
  ];

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/projects");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to load projects");
      }
      const data = (await res.json()) as AdminProject[];
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    socket.on("notification:new", (payload: any) => {
      if (!payload || typeof payload.title !== "string") {
        return;
      }

      if (payload.title === "New project created") {
        fetchProjects();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewerMounted || !viewerProject) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      setViewerLoading(true);
      setViewerError(null);
      try {
        const res = await fetch(`http://localhost:5000/api/projects/${viewerProject._id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load project details');
        }
        const data = await res.json();
        if (!cancelled) {
          setViewerData(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setViewerError(err.message || 'Failed to load project details');
        }
      } finally {
        if (!cancelled) {
          setViewerLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [viewerMounted, viewerProject]);

  useEffect(() => {
    if (!beneficiariesOpen || !beneficiariesProject) return;

    let cancelled = false;

    const run = async () => {
      setBeneficiariesLoading(true);
      setBeneficiariesError(null);
      try {
        const res = await fetch(`http://localhost:5000/api/projects/${beneficiariesProject._id}/beneficiaries`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load beneficiaries');
        }

        const data = (await res.json()) as Array<{
          email: string;
          status: 'active' | 'removed';
          joinedAt?: string;
          updatedAt?: string;
          fullName?: string;
        }>;

        if (!cancelled) {
          setBeneficiaries(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setBeneficiariesError(err.message || 'Failed to load beneficiaries');
        }
      } finally {
        if (!cancelled) {
          setBeneficiariesLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [beneficiariesOpen, beneficiariesProject]);

  const handleExportBeneficiariesCsv = () => {
    if (!beneficiariesProject || !beneficiaries.length) {
      return;
    }

    const header = ['Email', 'Full name', 'Status', 'Joined at', 'Last updated'];
    const rows = beneficiaries.map((row) => {
      const joined = row.joinedAt ? new Date(row.joinedAt).toLocaleString('en-PH') : '';
      const updated = row.updatedAt ? new Date(row.updatedAt).toLocaleString('en-PH') : '';
      const displayName = (row as any).fullName || row.email;
      return [row.email, displayName, row.status, joined, updated];
    });

    const csv = [header, ...rows]
      .map((cols) =>
        cols
          .map((value) => {
            const v = value ?? '';
            if (typeof v !== 'string') return String(v);
            const needsQuotes = v.includes(',') || v.includes('\n') || v.includes('"');
            const escaped = v.replace(/"/g, '""');
            return needsQuotes ? `"${escaped}"` : escaped;
          })
          .join(','),
      )
      .join('\n');

    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (beneficiariesProject.name || 'project').replace(/[^a-z0-9_-]+/gi, '_');
      link.href = url;
      link.setAttribute('download', `${safeName}-beneficiaries.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // best-effort only; if it fails, user can still view list on screen
    }
  };

  const handleExportProjectSummaryCsv = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/projects/summary-xlsx');
      if (!res.ok) {
        return;
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'unihub-project-summary.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
    }
  };

  useEffect(() => {
    // Ensure evaluation arrays always match criteria length
    if (evaluationRatings.length !== evaluationCriteria.length) {
      setEvaluationRatings(new Array(evaluationCriteria.length).fill(NaN));
    }
    if (evaluationRowRemarks.length !== evaluationCriteria.length) {
      setEvaluationRowRemarks(new Array(evaluationCriteria.length).fill(''));
    }
  }, [evaluationRatings.length, evaluationRowRemarks.length, evaluationCriteria.length]);

  const evaluatedNumericRatings = evaluationRatings.filter((value) =>
    typeof value === 'number' && Number.isFinite(value),
  );
  const evaluationTotalScore = evaluatedNumericRatings.reduce((sum, value) => sum + value, 0);
  const evaluationAverageScore = evaluatedNumericRatings.length
    ? evaluationTotalScore / evaluatedNumericRatings.length
    : 0;

  const handleSubmitEvaluation = async (nextStatus: 'Approved' | 'Rejected') => {
    if (!viewerProject || evaluationSaving) return;

    setEvaluationSaving(true);
    setEvaluationError(null);

    try {
      const criteria = evaluationCriteria.map((row, index) => ({
        label: row.label,
        rating: Number.isFinite(evaluationRatings[index]) ? evaluationRatings[index] : null,
        remarks: evaluationRowRemarks[index] ?? '',
      }));

      const payload = {
        status: nextStatus,
        evaluation: {
          title: evaluationTitle,
          campus: evaluationCampus,
          criteria,
          totalScore: evaluationTotalScore,
          averageScore: evaluationAverageScore,
          overallComments: evaluationOverallComments,
          extensionRemarks: evaluationExtensionRemarks,
          extensionFlags: {
            revised: evaluationExtensionRevised,
            deferred: evaluationExtensionDeferred,
          },
        },
      };

      const res = await fetch(`http://localhost:5000/api/projects/${viewerProject._id}/evaluate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error((data as any).message || 'Failed to save evaluation');
      }

      const updated = (await res.json()) as AdminProject & { status?: string };

      setProjects((prev) =>
        prev.map((project) =>
          project._id === updated._id
            ? { ...project, status: (updated as any).status || project.status }
            : project,
        ),
      );

      setEvaluateVisible(false);
      window.setTimeout(() => {
        setEvaluateMounted(false);
      }, 320);
    } catch (error: any) {
      setEvaluationError(error.message || 'Failed to save evaluation');
    } finally {
      setEvaluationSaving(false);
    }
  };

  const { approvalProjects, approvedProjects, completedOrEndedProjects } = useMemo(() => {
    const now = nowMs;

    const approval: (AdminProject & { derivedStatus: string })[] = [];
    const approved: (AdminProject & { derivedStatus: string })[] = [];
    const completedOrEnded: (AdminProject & { derivedStatus: string })[] = [];

    // Helper to determine derived status
    const getDerivedStatus = (project: AdminProject) => {
      const status = project.status || 'Pending';
      
      if (status === 'Pending') return 'Pending';
      if (status === 'Rejected') return 'Rejected';

      // Status is Approved, check for completion
      const rawSchedule = Array.isArray(project.activitySchedule) ? project.activitySchedule : [];
      if (rawSchedule.length === 0) return 'Approved';

      let allEnded = true;
      for (const item of rawSchedule) {
        const endMs = item.endAt ? new Date(item.endAt).getTime() : NaN;
        const hasEnd = Number.isFinite(endMs);
        const isEnded = hasEnd && endMs < now;
        if (!isEnded) {
          allEnded = false;
          break;
        }
      }

      return allEnded ? 'Completed' : 'Approved';
    };

    projects.forEach((project) => {
       const derived = getDerivedStatus(project);
       const withDerived = { ...project, derivedStatus: derived };
       
       if (derived === 'Pending') {
          approval.push(withDerived);
       } else if (derived === 'Approved') { 
          approved.push(withDerived);
       } else if (derived === 'Completed') {
          completedOrEnded.push(withDerived);
       }
    });

    return { approvalProjects: approval, approvedProjects: approved, completedOrEndedProjects: completedOrEnded };
  }, [projects, nowMs]);

  const renderProjectCard = (project: AdminProject & { derivedStatus: string }) => {
    const status = project.derivedStatus;
    
    let statusLabel = status;
    let statusColor = 'bg-gray-50 text-gray-700 border-gray-200';

    if (status === 'Approved') {
       statusLabel = 'Approved';
       statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (status === 'Rejected') {
        statusLabel = 'Rejected';
        statusColor = 'bg-red-50 text-red-700 border-red-200';
     } else if (status === 'Pending') {
        statusLabel = 'Pending';
        statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
     } else if (status === 'Completed') {
       statusLabel = 'Completed';
       statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
    }

    const isHighlighted = project._id === highlightProjectId;

    return (
      <div
        key={project._id}
        className={`flex flex-col rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
          isHighlighted
            ? 'border-amber-400 shadow-amber-300 ring-2 ring-amber-300 animate-pulse'
            : 'border-amber-100'
        }`}
      >
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-900 line-clamp-2">{project.name}</h2>
          <p className="text-xs text-gray-600 line-clamp-3">{project.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 text-xs">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusColor}`}
          >
            {statusLabel}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBeneficiariesProject(project);
                setBeneficiariesOpen(true);
              }}
              className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              Beneficiaries
            </button>
            <button
              type="button"
              onClick={() => {
                setViewerProject(project);
                setViewerMounted(true);
                window.setTimeout(() => setViewerVisible(true), 20);
              }}
              className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              View
            </button>
          </div>
        </div>
      </div>  
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects approvals</h1>
          <p className="text-sm text-gray-600">
            Review project proposals submitted by project leaders and manage their approval status.
          </p>
        </div>
        <div className="mt-2 flex items-center md:mt-0">
          <button
            type="button"
            onClick={() => {
              setExportPreviewKind('summary');
              setExportPreviewOpen(true);
            }}
            className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
          >
            Export project summary (.xlsx)
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-center text-sm text-gray-600 py-10">Loading projects…</div>
      ) : error ? (
        <div className="text-center text-sm text-red-600 py-10">{error}</div>
      ) : projects.length === 0 ? (
        <div className="text-center text-sm text-gray-600 py-10">
          No project proposals have been submitted yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Column 1: For approval */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">For approval</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-amber-600 shadow-sm border border-amber-100">
                {approvalProjects.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {approvalProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500">
                  No pending projects
                </div>
              ) : (
                approvalProjects.map(renderProjectCard)
              )}
            </div>
          </div>

          {/* Column 2: Approved */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Approved</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-emerald-600 shadow-sm border border-emerald-100">
                {approvedProjects.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {approvedProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500">
                  No approved projects
                </div>
              ) : (
                approvedProjects.map(renderProjectCard)
              )}
            </div>
          </div>

          {/* Column 3: Completed / Ended */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Completed / Ended</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-blue-600 shadow-sm border border-blue-100">
                {completedOrEndedProjects.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {completedOrEndedProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500">
                  No completed projects
                </div>
              ) : (
                completedOrEndedProjects.map(renderProjectCard)
              )}
            </div>
          </div>
        </div>
      )}

      {exportPreviewOpen && exportPreviewKind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-2xl border border-amber-100 bg-white p-5 text-sm text-gray-800 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Export preview</p>
                <h2 className="mt-1 text-base font-semibold text-gray-900">
                  {exportPreviewKind === 'summary' ? 'Project summary file' : 'Beneficiaries list'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setExportPreviewOpen(false);
                  setExportPreviewKind(null);
                }}
                className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {exportPreviewKind === 'summary' ? (
                <>
                  <p className="text-gray-700">
                    You are about to export an overview of all projects, including their basic details and
                    evaluation status.
                  </p>
                  <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2">
                    <p className="font-semibold text-gray-900">File name</p>
                    <p className="text-[11px] text-gray-700">unihub-project-summary.xlsx</p>
                    <p className="mt-1 text-[11px] text-gray-500">Format: Microsoft Excel (.xlsx)</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-gray-700">
                      You are about to export the beneficiaries list for this project as a CSV file.
                    </p>
                    {beneficiariesProject && (
                      <p className="text-[11px] text-gray-500">
                        Project: <span className="font-semibold text-gray-800">{beneficiariesProject.name}</span>
                      </p>
                    )}
                  </div>
                  <div className="mt-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Approximate rows</p>
                        <p className="text-[11px] text-gray-700">
                          {beneficiaries.length > 0
                            ? `${beneficiaries.length} beneficiary record${beneficiaries.length === 1 ? '' : 's'}`
                            : 'No beneficiaries loaded. Open a project and view beneficiaries first.'}
                        </p>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 border border-amber-200">
                        CSV format
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">Each row will contain name, email and timestamps.</p>
                  </div>
                  {beneficiaries.length > 0 && (
                    <div className="mt-3 rounded-lg border border-amber-100 bg-white/90 shadow-sm">
                      <div className="max-h-48 overflow-auto min-w-[36rem]">
                        <table className="min-w-full border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-amber-50/80 text-[10px] uppercase tracking-wide text-gray-600">
                              <th className="border-b border-amber-100 px-3 py-1.5 text-left font-semibold whitespace-nowrap">Name</th>
                              <th className="border-b border-amber-100 px-3 py-1.5 text-left font-semibold">Email</th>
                              <th className="border-b border-amber-100 px-3 py-1.5 text-left font-semibold">Joined at</th>
                              <th className="border-b border-amber-100 px-3 py-1.5 text-left font-semibold">Last updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {beneficiaries.map((row) => {
                              const joined = row.joinedAt ? new Date(row.joinedAt).toLocaleString('en-PH') : '';
                              const updated = row.updatedAt ? new Date(row.updatedAt).toLocaleString('en-PH') : '';
                              const displayName = (row as any).fullName || row.email;

                              return (
                                <tr key={row.email} className="odd:bg-white even:bg-amber-50/40">
                                  <td className="border-b border-amber-50 px-3 py-1.5 align-top text-gray-900 whitespace-nowrap">
                                    {displayName}
                                  </td>
                                  <td className="border-b border-amber-50 px-3 py-1.5 align-top text-gray-700">{row.email}</td>
                                  <td className="border-b border-amber-50 px-3 py-1.5 align-top text-gray-700">{joined}</td>
                                  <td className="border-b border-amber-50 px-3 py-1.5 align-top text-gray-700">{updated}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setExportPreviewOpen(false);
                  setExportPreviewKind(null);
                }}
                className="rounded-full border border-amber-200 px-3 py-1 font-semibold text-amber-700 hover:bg-amber-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (exportPreviewKind === 'summary') {
                    await handleExportProjectSummaryCsv();
                  } else if (exportPreviewKind === 'beneficiaries') {
                    handleExportBeneficiariesCsv();
                  }
                  setExportPreviewOpen(false);
                  setExportPreviewKind(null);
                }}
                className="rounded-full bg-amber-500 px-3 py-1 font-semibold text-white shadow hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={exportPreviewKind === 'beneficiaries' && (!beneficiariesProject || !beneficiaries.length)}
              >
                Export now
              </button>
            </div>
          </div>
        </div>
      )}

      {viewerMounted && (
        <div
          className="fixed inset-0 z-40 flex bg-black/40 backdrop-blur-sm"
          style={{
            opacity: viewerVisible ? 1 : 0,
            transition: 'opacity 280ms ease-in-out',
          }}
        >
          <div
            className="flex h-full w-full flex-col bg-white shadow-2xl"
            style={{
              transform: viewerVisible ? 'translateX(0%)' : 'translateX(100%)',
              transition: 'transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1)',
            }}
          >
            <div className="flex items-center justify-between border-b border-amber-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Admin Workspace</p>
                <h2 className="text-lg font-semibold text-gray-900">Project details</h2>
                {viewerProject && (
                  <p className="text-xs text-gray-500 line-clamp-1">{viewerProject.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    !!viewerProject?.status && viewerProject.status !== 'Pending'
                  }
                  onClick={() => {
                    if (viewerProject?.status && viewerProject.status !== 'Pending') {
                      return;
                    }
                    setEvaluationTitle(viewerProject?.name || '');
                    setEvaluationCampus('');
                    setEvaluationRatings(new Array(evaluationCriteria.length).fill(NaN));
                    setEvaluationRowRemarks(new Array(evaluationCriteria.length).fill(''));
                    setEvaluationOverallComments('');
                    setEvaluationExtensionRemarks('');
                    setEvaluationExtensionRevised(false);
                    setEvaluationExtensionDeferred(false);
                    setEvaluateMounted(true);
                    window.setTimeout(() => setEvaluateVisible(true), 20);
                  }}
                  className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Evaluate project
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewerVisible(false);
                    window.setTimeout(() => {
                      setViewerMounted(false);
                      setViewerProject(null);
                    }, 340);
                  }}
                  className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex h-full min-h-0" ref={viewerRootRef}>
              <aside className="hidden w-64 border-r border-amber-100 bg-amber-50/60 p-4 text-xs text-gray-800 sm:flex sm:flex-col">
                <p className="mb-3 font-semibold uppercase tracking-wide text-amber-700">Sections</p>
                <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                  {viewerSections.map((section) => {
                    const isActive = section.id === activeSectionId;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSectionId(section.id)}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-[11px] font-medium transition ${
                          isActive
                            ? 'bg-amber-500 text-white shadow'
                            : 'bg-white text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        {section.label}
                      </button>
                    );
                  })}
                </nav>
              </aside>
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
                <div className="mx-auto w-full max-w-6xl space-y-4 text-sm text-gray-700">
                  {viewerLoading ? (
                    <div className="text-center text-xs text-gray-600">Loading proposal…</div>
                  ) : viewerError ? (
                    <div className="text-center text-xs text-red-600">{viewerError}</div>
                  ) : !viewerData || !(viewerData as any).proposalData ? (
                    <div className="text-center text-xs text-gray-500">
                      This project does not have a stored proposal.
                    </div>
                  ) : (
                    viewerSections.map((section) => {
                      const proposal = (viewerData as any).proposalData as Record<string, any>;
                      const snapshot = proposal[section.id];
                      const isActive = section.id === activeSectionId;

                      return (
                        <div
                          key={section.id}
                          data-admin-section-id={section.id}
                          className={isActive ? 'space-y-3' : 'hidden'}
                          aria-hidden={isActive ? 'false' : 'true'}
                        >
                          <h3 className="text-sm font-semibold text-gray-900">{section.label}</h3>
                          {snapshot && snapshot.htmlContent ? (
                            <div
                              className="prose max-w-none select-text rounded-xl border border-amber-100 bg-amber-50/40 p-4 text-sm text-gray-800 prose-p:mb-2 pointer-events-none"
                              dangerouslySetInnerHTML={{ __html: snapshot.htmlContent as string }}
                            />
                          ) : (
                            <p className="text-xs text-gray-500">No content saved for this section.</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {evaluateMounted && (
        <div
          className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm"
          style={{
            opacity: evaluateVisible ? 1 : 0,
            transition: 'opacity 260ms ease-in-out',
          }}
        >
          <div
            className="flex h-full w-full flex-col bg-white shadow-2xl"
            style={{
              transform: evaluateVisible ? 'translateX(0%)' : 'translateX(100%)',
              transition: 'transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1)',
            }}
          >
            <div className="flex items-center justify-between border-b border-amber-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Admin Workspace</p>
                <h2 className="text-lg font-semibold text-gray-900">Evaluate project</h2>
                {viewerProject && (
                  <p className="text-xs text-gray-500 line-clamp-1">{viewerProject.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmitEvaluation('Rejected')}
                  disabled={evaluationSaving}
                  className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitEvaluation('Approved')}
                  disabled={evaluationSaving}
                  className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEvaluateVisible(false);
                    window.setTimeout(() => {
                      setEvaluateMounted(false);
                    }, 320);
                  }}
                  className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              <div className="mx-auto w-full max-w-5xl space-y-6 text-sm text-gray-800">
                {evaluationError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {evaluationError}
                  </div>
                )}

                <section className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Proposal information</h3>
                  <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-center">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Title of the Proposal
                    </span>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      value={evaluationTitle}
                      onChange={(event) => setEvaluationTitle(event.target.value)}
                      placeholder="Enter or refine project title for evaluation"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">Campus</span>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      value={evaluationCampus}
                      onChange={(event) => setEvaluationCampus(event.target.value)}
                      placeholder="Type campus here"
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Criteria for Evaluation (Phase 2 and Above / Continuing)
                    </h3>
                    <p className="text-xs text-gray-500">
                      Rating scale: 5 - Outstanding, 4 - Very Satisfactory, 3 - Satisfactory, 2 - Fair, 1 - Poor
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border border-amber-100 text-xs sm:text-sm text-gray-800">
                      <thead>
                        <tr>
                          <th className="border border-amber-100 bg-amber-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                            Criteria for Evaluation
                          </th>
                          <th className="w-32 border border-amber-100 bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                            Rating Scale
                          </th>
                          <th className="border border-amber-100 bg-amber-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                            Remarks / Comments
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluationCriteria.map((row, index) => {
                          const ratingValue = evaluationRatings[index];
                          const displayRating =
                            typeof ratingValue === 'number' && Number.isFinite(ratingValue)
                              ? ratingValue.toFixed(2)
                              : '';

                          return (
                            <tr key={row.label} className="align-top">
                              <td className="border border-amber-100 px-3 py-2 text-xs sm:text-sm">
                                {row.label}
                              </td>
                              <td className="border border-amber-100 px-2 py-2 text-center align-middle">
                                <input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  max={5}
                                  className="w-full rounded-md border border-amber-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                  value={displayRating}
                                  onChange={(event) => {
                                    const value = parseFloat(event.target.value);
                                    setEvaluationRatings((prev) => {
                                      const next = [...prev];
                                      next[index] = Number.isFinite(value) ? value : NaN;
                                      return next;
                                    });
                                  }}
                                />
                              </td>
                              <td className="border border-amber-100 px-3 py-2">
                                <input
                                  type="text"
                                  className="w-full rounded-md border border-amber-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                  value={evaluationRowRemarks[index] ?? ''}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setEvaluationRowRemarks((prev) => {
                                      const next = [...prev];
                                      next[index] = value;
                                      return next;
                                    });
                                  }}
                                  placeholder="Type remarks for this criterion"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-amber-50/70">
                          <td className="border border-amber-100 px-3 py-2 text-right text-xs font-semibold text-gray-900">
                            TOTAL SCORE
                          </td>
                          <td className="border border-amber-100 px-3 py-2 text-center text-xs font-semibold text-gray-900">
                            {evaluationTotalScore.toFixed(2)}
                          </td>
                          <td className="border border-amber-100 px-3 py-2" />
                        </tr>
                        <tr className="bg-amber-50/70">
                          <td className="border border-amber-100 px-3 py-2 text-right text-xs font-semibold text-gray-900">
                            TOTAL AVERAGE POINTS
                          </td>
                          <td className="border border-amber-100 px-3 py-2 text-center text-xs font-semibold text-gray-900">
                            {evaluationAverageScore.toFixed(2)}
                          </td>
                          <td className="border border-amber-100 px-3 py-2" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>

                <section className="space-y-3 rounded-xl border border-amber-100 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Overall comments / recommendations</h3>
                  <textarea
                    className="min-h-[120px] w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    value={evaluationOverallComments}
                    onChange={(event) => setEvaluationOverallComments(event.target.value)}
                    placeholder="Write overall comments and recommendations about this extension proposal."
                  />
                </section>

                <section className="space-y-3 rounded-xl border border-amber-100 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Extension Proposal Remarks</h3>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-800">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                        checked={evaluationExtensionRevised}
                        onChange={(event) => setEvaluationExtensionRevised(event.target.checked)}
                      />
                      <span>Revised</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                        checked={evaluationExtensionDeferred}
                        onChange={(event) => setEvaluationExtensionDeferred(event.target.checked)}
                      />
                      <span>Deferred</span>
                    </label>
                  </div>
                  <textarea
                    className="min-h-[80px] w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    value={evaluationExtensionRemarks}
                    onChange={(event) => setEvaluationExtensionRemarks(event.target.value)}
                    placeholder="Add specific notes related to the extension proposal."
                  />
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {beneficiariesProject && (
        <div
          className="fixed inset-0 z-40 flex bg-black/40 backdrop-blur-sm"
          style={{
            opacity: beneficiariesOpen ? 1 : 0,
            pointerEvents: beneficiariesOpen ? 'auto' : 'none',
            transition: 'opacity 220ms ease-in-out',
          }}
        >
          <div
            className="ml-auto flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl"
            style={{
              transform: beneficiariesOpen ? 'translateX(0%)' : 'translateX(100%)',
              transition: 'transform 260ms cubic-bezier(0.22, 0.61, 0.36, 1)',
            }}
          >
            <div className="flex items-center justify-between border-b border-amber-100 px-5 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Project beneficiaries</p>
                <h2 className="text-sm font-semibold text-gray-900">
                  {beneficiariesProject.name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExportPreviewKind('beneficiaries');
                    setExportPreviewOpen(true);
                  }}
                  disabled={!beneficiaries.length}
                  className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBeneficiariesOpen(false);
                  }}
                  className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-gray-800">
              {beneficiariesLoading ? (
                <div className="text-xs text-gray-600">Loading beneficiaries…</div>
              ) : beneficiariesError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {beneficiariesError}
                </div>
              ) : beneficiaries.length === 0 ? (
                <div className="text-xs text-gray-600">
                  No beneficiaries have been recorded for this project yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[52rem] border border-amber-100 text-xs">
                    <thead>
                      <tr className="bg-amber-50">
                        <th className="border border-amber-100 px-3 py-2 text-left font-semibold text-gray-700">
                          Email
                        </th>
                        <th className="border border-amber-100 px-3 py-2 text-left font-semibold text-gray-700">
                          Full name
                        </th>
                        <th className="border border-amber-100 px-3 py-2 text-left font-semibold text-gray-700">
                          Joined at
                        </th>
                        <th className="border border-amber-100 px-3 py-2 text-left font-semibold text-gray-700">
                          Last updated
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaries.map((row) => {
                        const displayName = (row as any).fullName || row.email;

                        return (
                          <tr key={row.email} className="align-top">
                            <td className="border border-amber-100 px-3 py-2 text-[11px] sm:text-xs">
                              {row.email}
                            </td>
                            <td className="border border-amber-100 px-3 py-2 text-[11px] sm:text-xs whitespace-nowrap">
                              {displayName}
                            </td>
                            <td className="border border-amber-100 px-3 py-2 text-[11px] sm:text-xs whitespace-nowrap">
                              {row.joinedAt ? new Date(row.joinedAt).toLocaleString('en-PH') : ''}
                            </td>
                            <td className="border border-amber-100 px-3 py-2 text-[11px] sm:text-xs whitespace-nowrap">
                              {row.updatedAt ? new Date(row.updatedAt).toLocaleString('en-PH') : ''}
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
      )}
    </div>
  );
}