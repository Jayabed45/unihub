import { INotification } from '../models/Notification';
import { IProject } from '../models/Project';
import { IUser } from '../models/User';

const UNIHUB_LOGO_URL =
  'https://storage.googleapis.com/unihub-33b55.appspot.com/unihub-logo-v2-email.png';
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const createBaseEmail = (subject: string, content: string) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${subject}</title>
  <style>
    /* Minimalist, logo-less, header-less light theme */
    body { margin:0; padding:0; background-color:#fafafa; }
    .wrap { width:100%; padding:24px 12px; box-sizing:border-box; }
    .container { width:100%; max-width:560px; margin:0 auto; }
    .card { background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb; box-shadow:0 1px 2px rgba(2,6,23,0.04); }
    .px { padding-left:22px; padding-right:22px; }
    .py { padding-top:22px; padding-bottom:22px; }
    .muted { color:#6b7280; }
    .text { color:#0f172a; }
    .paragraph { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:1.7; margin:0 0 14px; color:#111827; }
    .btn { display:inline-block; padding:10px 16px; border-radius:9px; background:#111827; color:#f8fafc !important; font-weight:600; text-decoration:none; border:1px solid #0b1220; box-shadow:none; }
    .btn:hover { filter:brightness(0.98); }
    .pill { display:inline-block; padding:6px 10px; border-radius:9999px; background:#111827; color:#f8fafc; font-size:13px; font-weight:700; letter-spacing:0.06em; }
    .footer { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; color:#9ca3af; }
    .preheader { display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
    .badge { display:inline-block; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; padding:6px 10px; border-radius:9999px; border:1px solid transparent; }
    .badge--admin { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
    .badge--leader { background:#ecfdf5; color:#059669; border-color:#a7f3d0; }
    .badge--participant { background:#fff7ed; color:#c2410c; border-color:#fed7aa; }
    @media (max-width: 640px) {
      .px { padding-left:16px; padding-right:16px; }
      .py { padding-top:18px; padding-bottom:18px; }
      .paragraph { font-size:14px; }
    }
  </style>
  <!--[if mso]>
    <style type="text/css">
      .btn { font-family: Arial, sans-serif !important; }
    </style>
  <![endif]-->
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  </head>
<body>
  <div class="preheader">${subject}</div>
  <div class="wrap">
    <div class="container">
      <div class="card">
        <div class="px py">
          <div class="paragraph">${content}</div>
        </div>
        <div style="height:1px; background:#f3f4f6"></div>
        <div class="px" style="padding-top:14px; padding-bottom:18px;">
          <p class="footer" style="margin:0 0 6px">This is an automated notification. Please do not reply.</p>
          <p class="footer" style="margin:0">© ${new Date().getFullYear()} UniHub. All rights reserved.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const buildBasicEmail = (subject: string, contentHtml: string) =>
  createBaseEmail(subject, contentHtml);

export type RoleKind = 'Admin' | 'Project Leader' | 'Participant';

export const buildRoleEmail = (
  role: RoleKind,
  subject: string,
  contentHtml: string,
) => {
  const cls = role === 'Admin' ? 'badge--admin' : role === 'Project Leader' ? 'badge--leader' : 'badge--participant';
  const roleBadge = `<div class="${'badge ' + cls}">${role}</div>`;
  const spacer = '<div style="height:10px"></div>';
  return createBaseEmail(subject, `${roleBadge}${spacer}${contentHtml}`);
};

interface TemplateData {
  notification: INotification;
  project?: IProject | null;
  user?: IUser | null;
}

const getJoinRequestContent = ({ notification, project, user }: TemplateData) => `
  <p>You have a new request to join your project, <strong>${project?.name || 'a project'}</strong>.</p>
  <p><strong>${user?.email || notification.recipientEmail}</strong> wants to join.</p>
  <a href="${BASE_URL}/project-leader/participants" class="btn">View Join Requests</a>
`;

const getJoinRequestApprovedContent = ({ notification, project }: TemplateData) => `
  <p>Congratulations!</p>
  <p>Your request to join the project <strong>${project?.name || 'a project'}</strong> has been approved.</p>
  <a href="${BASE_URL}/participant/Feeds" class="btn">View My Projects</a>
`;

const getActivityJoinContent = ({ notification, project }: TemplateData) => {
  const activityTitleMatch = notification.message.match(/activity '(.*?)'/);
  const activityTitle = activityTitleMatch ? activityTitleMatch[1] : 'an activity';
  return `
    <p class="paragraph">A participant has joined an activity in your project, <strong>${project?.name || 'a project'}</strong>.</p>
    <p class="paragraph"><strong>${notification.recipientEmail}</strong> joined '${activityTitle}'.</p>
    <a href="${BASE_URL}/project-leader/participants" class="btn">View Participants</a>
  `;
};

const getActivityEvaluationContent = ({ notification, project }: TemplateData) => {
    const activityTitleMatch = notification.message.match(/:(.*?):/);
    const activityTitle = activityTitleMatch ? activityTitleMatch[1] : 'this activity';
    return `
    <p class="paragraph">An activity you participated in has concluded.</p>
    <p class="paragraph">Please take a moment to complete the evaluation form for <strong>${activityTitle}</strong> in project <strong>${project?.name || 'a project'}</strong>.</p>
    <a href="${BASE_URL}/participant/Feeds" class="btn">Complete Evaluation</a>
  `;
};

const getActivityReminderContent = ({ notification, project }: TemplateData) => {
    const activityTitleMatch = notification.message.match(/:(.*?):/);
    const activityTitle = activityTitleMatch ? activityTitleMatch[1] : 'An activity';
    const mainMessage = notification.message.substring(notification.message.indexOf(':') + 1);
    return `
    <p class="paragraph">This is a reminder for an activity in project <strong>${project?.name || 'a project'}</strong>.</p>
    <p class="paragraph"><strong>${activityTitle}</strong>: ${mainMessage}</p>
    <a href="${BASE_URL}/participant/Feeds" class="btn">View Activity Feeds</a>
  `;
};

export const generateEmailHtml = (data: TemplateData): { subject: string; html: string } => {
  const { notification } = data;
  let subject = notification.title;
  let content = `<p>${notification.message}</p>`; // Fallback

  switch (notification.title) {
    case 'Join request':
      subject = 'New Join Request for Your Project';
      content = getJoinRequestContent(data);
      break;
    case 'Join request approved':
        subject = 'Your Join Request Was Approved';
        content = getJoinRequestApprovedContent(data);
        break;
    case 'Activity join':
        subject = 'New Participant Joined an Activity';
        content = getActivityJoinContent(data);
        break;
    case 'Activity Evaluation':
        subject = 'Please Evaluate Your Recent Activity';
        content = getActivityEvaluationContent(data);
        break;
    case 'Activity Starting Soon':
    case 'Activity Started':
    case 'Activity Ending Soon':
    case 'Activity Ended':
        subject = `Activity Reminder: ${notification.title}`;
        content = getActivityReminderContent(data);
        break;
  }

  return {
    subject,
    html: createBaseEmail(subject, content),
  };
};
