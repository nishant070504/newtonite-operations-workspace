import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUp,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Circle,
  CircleDot,
  CircleHelp,
  Clock3,
  Command,
  Inbox,
  ListFilter,
  Menu,
  MoreHorizontal,
  Moon,
  Palette,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Target,
  X,
  Zap,
} from 'lucide-react';

type Status = 'In progress' | 'Todo' | 'Done' | 'Backlog';
type Priority = 'Urgent' | 'High' | 'Medium' | 'Low';
type View = 'My issues' | 'All issues' | 'Activity';
type TeamName = 'Operations' | 'Finance' | 'Support';
type TeamScope = TeamName | 'All teams';
type ThemeName = 'office' | 'dark';

const labelPresets = [
  'Customer',
  'Investigation',
  'Payments',
  'Access',
  'Process',
  'Vendors',
  'Compliance',
  'Reliability',
  'Escalations',
  'Refunds',
  'Policy',
  'Launch',
  'Reporting',
  'Feedback',
  'Invoices',
  'Bug',
  'New',
];


const themes: { name: ThemeName; label: string; swatch: string; description: string }[] = [
  { name: 'office', label: 'Office', swatch: '#245397', description: 'Daytime focus' },
  { name: 'dark', label: 'Midnight', swatch: '#8da9d2', description: 'Evening focus' },
];

function getTimeTheme(): ThemeName {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? 'office' : 'dark';
}

type Issue = {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  team: string;
  assignee: string;
  initials: string;
  avatar: string;
  due: string;
  updated: string;
  comments: number;
  labels: string[];
};

const initialIssues: Issue[] = [
  {
    id: 'OPS-142',
    title: 'Investigate duplicate customer requests',
    description: 'Several customer requests appear to be duplicated across the intake channels. Identify the source and propose a safe deduplication flow.',
    status: 'In progress',
    priority: 'Urgent',
    team: 'Operations',
    assignee: 'Maya Chen',
    initials: 'MC',
    avatar: 'bg-[#dce8ff] text-[#3157a4]',
    due: 'Today',
    updated: '12 min ago',
    comments: 8,
    labels: ['Customer', 'Investigation'],
  },
  {
    id: 'OPS-139',
    title: 'Review payment reconciliation exceptions',
    description: 'Triage the exceptions from this week and confirm which ones need manual approval before close.',
    status: 'In progress',
    priority: 'High',
    team: 'Finance',
    assignee: 'Jordan Lee',
    initials: 'JL',
    avatar: 'bg-[#ffe2d3] text-[#b24f2b]',
    due: 'Today',
    updated: '34 min ago',
    comments: 4,
    labels: ['Payments'],
  },
  {
    id: 'OPS-136',
    title: 'Approve access for new support cohort',
    description: 'Grant the new support cohort the permissions they need for the launch queue.',
    status: 'Todo',
    priority: 'High',
    team: 'People Ops',
    assignee: 'Ari Smith',
    initials: 'AS',
    avatar: 'bg-[#e8dbff] text-[#7651ad]',
    due: 'Tomorrow',
    updated: '1 hr ago',
    comments: 2,
    labels: ['Access'],
  },
  {
    id: 'OPS-131',
    title: 'Document incident response handoff',
    description: 'Capture the handoff steps and ownership boundaries while the details are still fresh.',
    status: 'Todo',
    priority: 'Medium',
    team: 'Operations',
    assignee: 'Maya Chen',
    initials: 'MC',
    avatar: 'bg-[#dce8ff] text-[#3157a4]',
    due: 'Fri, Oct 18',
    updated: 'Yesterday',
    comments: 6,
    labels: ['Process'],
  },
  {
    id: 'OPS-127',
    title: 'Set up weekly vendor review',
    description: 'Create a lightweight recurring review for vendor health and upcoming changes.',
    status: 'Backlog',
    priority: 'Low',
    team: 'Operations',
    assignee: 'Noah Williams',
    initials: 'NW',
    avatar: 'bg-[#d9f3e7] text-[#257957]',
    due: 'Oct 24',
    updated: '2 days ago',
    comments: 1,
    labels: ['Vendors'],
  },
  {
    id: 'OPS-118',
    title: 'Resolve delayed export notifications',
    description: 'Confirm delivery timings and add visibility when an export is still processing.',
    status: 'Done',
    priority: 'Medium',
    team: 'Product',
    assignee: 'Nia Patel',
    initials: 'NP',
    avatar: 'bg-[#fce3ef] text-[#a43e70]',
    due: 'Oct 11',
    updated: 'Oct 11',
    comments: 5,
    labels: ['Reliability'],
  },
  {
    id: 'OPS-121',
    title: 'Prepare support escalation summary',
    description: 'Summarize the open customer escalations and identify the next owner for each one before the weekly review.',
    status: 'Todo',
    priority: 'Medium',
    team: 'Support',
    assignee: 'You',
    initials: 'YO',
    avatar: 'bg-[#d9f3e7] text-[#257957]',
    due: 'Thu, Oct 17',
    updated: '3 hrs ago',
    comments: 3,
    labels: ['Escalations'],
  },
  {
    id: 'OPS-145',
    title: 'Triage incoming refund requests',
    description: 'Review the refund queue and approve or escalate each request based on the updated policy.',
    status: 'In progress',
    priority: 'High',
    team: 'Finance',
    assignee: 'You',
    initials: 'YO',
    avatar: 'bg-[#d9f3e7] text-[#257957]',
    due: 'Today',
    updated: '20 min ago',
    comments: 2,
    labels: ['Refunds', 'Policy'],
  },
  {
    id: 'OPS-148',
    title: 'Update vendor onboarding checklist',
    description: 'Refresh the onboarding checklist to cover the new compliance questions from legal.',
    status: 'Todo',
    priority: 'Medium',
    team: 'Operations',
    assignee: 'You',
    initials: 'YO',
    avatar: 'bg-[#d9f3e7] text-[#257957]',
    due: 'Tomorrow',
    updated: '1 hr ago',
    comments: 0,
    labels: ['Vendors', 'Compliance'],
  },
  {
    id: 'OPS-150',
    title: 'Coordinate launch day coverage',
    description: 'Confirm coverage slots for launch day and make sure each shift has a clear owner.',
    status: 'Todo',
    priority: 'Urgent',
    team: 'Operations',
    assignee: 'You',
    initials: 'YO',
    avatar: 'bg-[#d9f3e7] text-[#257957]',
    due: 'Today',
    updated: '45 min ago',
    comments: 5,
    labels: ['Launch'],
  },
  {
    id: 'OPS-133',
    title: 'Draft monthly operations report',
    description: 'Pull the key metrics and write the narrative for the monthly operations review.',
    status: 'Backlog',
    priority: 'Low',
    team: 'Operations',
    assignee: 'You',
    initials: 'YO',
    avatar: 'bg-[#d9f3e7] text-[#257957]',
    due: 'Oct 25',
    updated: '2 days ago',
    comments: 1,
    labels: ['Reporting'],
  },
  {
    id: 'OPS-151',
    title: 'Review support cohort feedback',
    description: 'Go through the first-week feedback from the new support cohort and flag themes for the retro.',
    status: 'In progress',
    priority: 'Medium',
    team: 'Support',
    assignee: 'You',
    initials: 'YO',
    avatar: 'bg-[#d9f3e7] text-[#257957]',
    due: 'Fri, Oct 18',
    updated: '4 hrs ago',
    comments: 2,
    labels: ['Feedback'],
  },
  {
    id: 'OPS-126',
    title: 'Close out Q3 vendor invoices',
    description: 'Confirm all Q3 vendor invoices are paid and reconciled before the books close.',
    status: 'Done',
    priority: 'Medium',
    team: 'Finance',
    assignee: 'You',
    initials: 'YO',
    avatar: 'bg-[#d9f3e7] text-[#257957]',
    due: 'Oct 10',
    updated: 'Oct 10',
    comments: 3,
    labels: ['Invoices'],
  },
];

const activity = [
  { initials: 'MC', avatar: 'bg-[#dce8ff] text-[#3157a4]', name: 'Maya Chen', action: 'moved', target: 'Investigate duplicate customer requests', detail: 'to In progress', time: '12 min ago' },
  { initials: 'JL', avatar: 'bg-[#ffe2d3] text-[#b24f2b]', name: 'Jordan Lee', action: 'commented on', target: 'Review payment reconciliation exceptions', detail: '“I found 3 more exceptions in the latest batch.”', time: '34 min ago' },
  { initials: 'AS', avatar: 'bg-[#e8dbff] text-[#7651ad]', name: 'Ari Smith', action: 'assigned', target: 'Approve access for new support cohort', detail: 'to themselves', time: '1 hr ago' },
  { initials: 'NP', avatar: 'bg-[#fce3ef] text-[#a43e70]', name: 'Nia Patel', action: 'completed', target: 'Resolve delayed export notifications', detail: '', time: 'Yesterday' },
];

const navItems: { label: View; icon: typeof Inbox }[] = [
  { label: 'My issues', icon: Inbox },
  { label: 'All issues', icon: ListFilter },
  { label: 'Activity', icon: Activity },
];

function StatusIcon({ status }: { status: Status }) {
  if (status === 'Done') return <span className="status-icon status-done"><Check size={11} strokeWidth={3} /></span>;
  if (status === 'In progress') return <span className="status-icon status-progress"><span /></span>;
  if (status === 'Backlog') return <span className="status-icon status-backlog"><Circle size={13} /></span>;
  return <span className="status-icon status-todo"><CircleDot size={14} /></span>;
}

function PriorityIcon({ priority }: { priority: Priority }) {
  const color = priority === 'Urgent' ? 'text-[#e45757]' : priority === 'High' ? 'text-[#db8d36]' : priority === 'Medium' ? 'text-[#6b7280]' : 'text-[#b1b7c3]';
  return <span className={color}>{priority === 'Urgent' ? <Zap size={14} fill="currentColor" /> : <ArrowUp size={14} strokeWidth={priority === 'Low' ? 1.5 : 2.5} className={priority === 'Low' ? 'rotate-180' : ''} />}</span>;
}

function App() {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [view, setView] = useState<View>('My issues');
  const [activeTeam, setActiveTeam] = useState<TeamName>('Operations');
  const [teamScope, setTeamScope] = useState<TeamScope>('Operations');
  const [selectedId, setSelectedId] = useState('OPS-142');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(getTimeTheme);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<Status>('Todo');
  const [newPriority, setNewPriority] = useState<Priority>('Medium');
  const [newTeam, setNewTeam] = useState<TeamName>('Operations');
  const [newAssignee, setNewAssignee] = useState('You');
  const [newDue, setNewDue] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<Status>('Todo');
  const [editPriority, setEditPriority] = useState<Priority>('Medium');
  const [editTeam, setEditTeam] = useState<TeamName>('Operations');
  const [editAssignee, setEditAssignee] = useState('You');
  const [editDue, setEditDue] = useState('');
  const [editError, setEditError] = useState('');
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [newLabels, setNewLabels] = useState<string[]>([]);
  const [labelFilter, setLabelFilter] = useState<string>('All');
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [labelQuery, setLabelQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    const syncTheme = () => setTheme(getTimeTheme());
    const interval = window.setInterval(syncTheme, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredIssues = useMemo(() => issues.filter((issue) => {
    const matchesQuery = `${issue.title} ${issue.id} ${issue.team} ${issue.labels.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'All' || issue.status === statusFilter;
    const matchesTeam = teamScope === 'All teams' || issue.team === teamScope;
    const matchesMe = view !== 'My issues' || issue.assignee === 'You';
    const matchesLabel = labelFilter === 'All' || issue.labels.includes(labelFilter);
    return matchesQuery && matchesStatus && matchesTeam && matchesMe && matchesLabel;
  }), [issues, query, statusFilter, teamScope, view, labelFilter]);

  useEffect(() => { setPage(1); }, [query, statusFilter, teamScope, view, labelFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageIssues = filteredIssues.slice(pageStart, pageStart + pageSize);

  const selectedIssue = issues.find((issue) => issue.id === selectedId) ?? issues[0];

  const allLabelsInScope = useMemo(() => {
    const set = new Set<string>();
    issues.filter((issue) => view !== 'My issues' || issue.assignee === 'You').forEach((issue) => issue.labels.forEach((label) => set.add(label)));
    return Array.from(set).sort();
  }, [issues, view]);

  function toggleLabel(list: string[], label: string): string[] {
    return list.includes(label) ? list.filter((item) => item !== label) : [...list, label];
  }

  function addLabelToSelected(label: string) {
    if (!selectedIssue) return;
    setIssues((current) => current.map((issue) => issue.id === selectedIssue.id ? { ...issue, labels: toggleLabel(issue.labels, label), updated: 'Just now' } : issue));
  }

  function removeLabelFromSelected(label: string) {
    if (!selectedIssue) return;
    setIssues((current) => current.map((issue) => issue.id === selectedIssue.id ? { ...issue, labels: issue.labels.filter((item) => item !== label), updated: 'Just now' } : issue));
  }

  const availableDetailLabels = useMemo(() => {
    if (!selectedIssue) return labelPresets;
    return labelPresets.filter((label) => !selectedIssue.labels.includes(label));
  }, [selectedIssue]);

  const labelMenuMatches = useMemo(() => {
    const q = labelQuery.trim().toLowerCase();
    return availableDetailLabels.filter((label) => !q || label.toLowerCase().includes(q));
  }, [availableDetailLabels, labelQuery]);

  function createIssue() {
    if (!newTitle.trim()) return;
    const nextNumber = 143 + issues.length - initialIssues.length;
    const newIssue: Issue = {
      id: `OPS-${nextNumber}`,
      title: newTitle.trim(),
      description: newDescription.trim() || 'Add context and next steps for this operational request.',
      status: newStatus,
      priority: newPriority,
      team: newTeam,
      assignee: newAssignee,
      initials: 'YO',
      avatar: 'bg-[#d9f3e7] text-[#257957]',
      due: newDue.trim() || 'No due date',
      updated: 'Just now',
      comments: 0,
      labels: newLabels.length > 0 ? newLabels : ['New'],
    };
    setIssues((current) => [newIssue, ...current]);
    setSelectedId(newIssue.id);
    setNewTitle('');
    setNewDescription('');
    setNewStatus('Todo');
    setNewPriority('Medium');
    setNewTeam('Operations');
    setNewAssignee('You');
    setNewLabels([]);
    setShowCreate(false);
  }

  const allowedStatusTransitions: Record<Status, Status[]> = {
    Backlog: ['Todo'],
    Todo: ['In progress'],
    'In progress': ['Done'],
    Done: [],
  };

  function changeStatus(next: Status) {
    if (!selectedIssue || !allowedStatusTransitions[selectedIssue.status].includes(next)) return;
    setIssues((current) => current.map((issue) => issue.id === selectedIssue.id ? { ...issue, status: next, updated: 'Just now' } : issue));
  }

  function openEdit() {
    if (!selectedIssue) return;
    setEditTitle(selectedIssue.title);
    setEditDescription(selectedIssue.description);
    setEditStatus(selectedIssue.status);
    setEditPriority(selectedIssue.priority);
    setEditTeam(selectedIssue.team as TeamName);
    setEditAssignee(selectedIssue.assignee);
    setEditDue(selectedIssue.due === 'No due date' ? '' : selectedIssue.due);
    setEditLabels(selectedIssue.labels);
    setEditError('');
    setShowEdit(true);
  }

  function saveEdit() {
    if (!selectedIssue || !editTitle.trim()) return;
    if (editStatus !== selectedIssue.status && !allowedStatusTransitions[selectedIssue.status].includes(editStatus)) return;
    const currentDue = selectedIssue.due === 'No due date' ? '' : selectedIssue.due;
    if ((selectedIssue.priority === 'Urgent' || editPriority === 'Urgent') && editDue.trim() !== currentDue) {
      setEditError('Urgent issues must keep their due date.');
      return;
    }
    setIssues((current) => current.map((issue) => issue.id === selectedIssue.id ? { ...issue, title: editTitle.trim(), description: editDescription.trim(), status: editStatus, priority: editPriority, team: editTeam, assignee: editAssignee, due: editDue.trim() || 'No due date', labels: editLabels.length > 0 ? editLabels : ['New'], updated: 'Just now' } : issue));
    setShowEdit(false);
  }

  function selectView(nextView: View) {
    setView(nextView);
    if (nextView === 'All issues' || nextView === 'My issues') setTeamScope('All teams');
    setShowSidebar(false);
  }

  function selectTeam(team: TeamName) {
    setActiveTeam(team);
    setTeamScope(team);
    setView('All issues');
    setStatusFilter('All');
    setSelectedId(issues.find((issue) => issue.team === team)?.id ?? '');
    setShowSidebar(false);
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <aside className={`sidebar ${showSidebar ? 'sidebar-open' : ''}`}>
        <div className="workspace-switcher">
          <div className="workspace-mark">N</div>
          <div className="workspace-copy"><strong>Newtonite</strong><span>Operations workspace</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>
        <button className="quick-search" onClick={() => document.getElementById('global-search')?.focus()}><Search size={15} /><span>Search</span><kbd>⌘ K</kbd></button>
        <div className="sidebar-section">
          <p className="sidebar-label">Workspace</p>
          <nav>
            {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${view === label ? 'active' : ''}`} onClick={() => selectView(label)}><Icon size={16} /><span>{label}</span>{label === 'My issues' && <span className="nav-count">{issues.filter((issue) => issue.assignee === 'You').length}</span>}</button>)}
          </nav>
        </div>
        <div className="sidebar-section team-section">
          <div className="section-heading"><p className="sidebar-label">Teams</p><button aria-label="Add team"><Plus size={14} /></button></div>
          <button className={`nav-item active-team ${activeTeam === 'Operations' ? 'active' : ''}`} onClick={() => selectTeam('Operations')}><span className="team-dot" /><span>Operations</span><span className="nav-count">{issues.filter((issue) => issue.team === 'Operations').length}</span></button>
          <button className={`nav-item active-team ${activeTeam === 'Finance' ? 'active' : ''}`} onClick={() => selectTeam('Finance')}><span className="team-dot finance" /><span>Finance</span><span className="nav-count">{issues.filter((issue) => issue.team === 'Finance').length}</span></button>
          <button className={`nav-item active-team ${activeTeam === 'Support' ? 'active' : ''}`} onClick={() => selectTeam('Support')}><span className="team-dot support" /><span>Support</span><span className="nav-count">{issues.filter((issue) => issue.team === 'Support').length}</span></button>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item"><Settings size={16} /><span>Settings</span></button>
          <button className="user-chip" onClick={() => setShowProfile(true)}><div className="avatar avatar-small bg-[#d9f3e7] text-[#257957]">YO</div><div><strong>Your account</strong><span>you@newtonite.co</span></div><MoreHorizontal size={16} className="muted-icon" /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setShowSidebar(true)} aria-label="Open menu"><Menu size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{view}</strong></div>
          <div className="topbar-actions"><button className="icon-button" onClick={() => setShowHelp(true)} aria-label="Help"><CircleHelp size={18} /></button><button className="icon-button notification" onClick={() => setShowNotifications(true)} aria-label="Notifications"><Bell size={18} /><i /></button><div className="theme-control"><button className={`icon-button theme-trigger ${showThemeMenu ? 'theme-trigger-active' : ''}`} onClick={() => setShowThemeMenu((current) => !current)} aria-label="Change appearance"><Palette size={18} /></button>{showThemeMenu && <div className="theme-menu"><div className="theme-menu-heading"><div><strong>Appearance</strong><span>Make the workspace yours</span></div><Moon size={15} /></div><div className="theme-sync-note"><Moon size={13} /> Follows your local time automatically</div><div className="theme-options">{themes.map((option) => <button key={option.name} className={`theme-option ${theme === option.name ? 'selected-theme' : ''}`} onClick={() => { setTheme(option.name); setShowThemeMenu(false); }}><span className="theme-swatch" style={{ background: option.swatch }} /> <span><strong>{option.label}</strong><small>{option.description}</small></span>{theme === option.name && <span className="theme-check"><Check size={12} /></span>}</button>)}</div><div className="theme-menu-footer">Theme applies to this workspace</div></div>}</div><button className="icon-button avatar-button" onClick={() => setShowProfile(true)} aria-label="Open account"><div className="avatar avatar-small bg-[#d9f3e7] text-[#257957]">YO</div></button></div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> {formatToday(new Date())}</div><h1>{view === 'Activity' ? 'Activity' : view === 'My issues' ? 'My issues' : teamScope === 'All teams' ? 'All issues' : activeTeam}</h1><p>{view === 'Activity' ? 'See what is changing across your workspace.' : view === 'My issues' ? 'Issues assigned to you across every team.' : teamScope === 'All teams' ? 'Every issue across the Newtonite workspace.' : `Work assigned to the ${activeTeam} team.`}</p></div>
            <button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={16} strokeWidth={2.5} /> New issue <span className="button-shortcut">C</span></button>
          </section>

          {view === 'Activity' ? <ActivityView /> : <>
            <section className="stat-grid">
              <div className="stat-card"><div className="stat-card-top"><span>Open issues</span><CircleDot size={16} className="stat-blue" /></div><strong>{issues.filter((issue) => issue.status !== 'Done').length}</strong><small><ArrowUp size={12} /> 8% <em>from last week</em></small></div>
              <div className="stat-card"><div className="stat-card-top"><span>Due today</span><Clock3 size={16} className="stat-orange" /></div><strong>{issues.filter((issue) => issue.due === 'Today').length}</strong><small className="neutral-stat">Keep the momentum going</small></div>
              <div className="stat-card"><div className="stat-card-top"><span>Completed this week</span><Check size={16} className="stat-green" /></div><strong>{issues.filter((issue) => issue.status === 'Done').length}</strong><small><ArrowUp size={12} /> 24% <em>from last week</em></small></div>
              <div className="stat-card highlight-stat"><div className="stat-card-top"><span>Cycle progress</span><Target size={16} className="stat-violet" /></div><strong>68%</strong><div className="progress-track"><div className="progress-value" /></div><small>10 days remaining</small></div>
            </section>

            <section className="issues-card">
              <div className="issues-toolbar"><div className="tabs"><button className={statusFilter === 'All' ? 'selected' : ''} onClick={() => setStatusFilter('All')}>All issues <span>{issues.length}</span></button><button className={statusFilter === 'In progress' ? 'selected' : ''} onClick={() => setStatusFilter('In progress')}>In progress <span>{issues.filter((issue) => issue.status === 'In progress').length}</span></button><button className={statusFilter === 'Todo' ? 'selected' : ''} onClick={() => setStatusFilter('Todo')}>Todo <span>{issues.filter((issue) => issue.status === 'Todo').length}</span></button></div><div className="toolbar-right"><div className="search-wrap"><Search size={15} /><input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search issues..." /></div><button className={`filter-button ${showFilters ? 'filter-active' : ''}`} onClick={() => setShowFilters((current) => !current)}><SlidersHorizontal size={15} /> Filter{(statusFilter !== 'All' || labelFilter !== 'All') && <span className="filter-dot" />}</button><button className="icon-button desktop-only" aria-label="More options"><MoreHorizontal size={18} /></button></div></div>
              {showFilters && <div className="filter-row"><span>Filter by status</span>{(['All', 'In progress', 'Todo', 'Done', 'Backlog'] as const).map((status) => <button key={status} className={statusFilter === status ? 'filter-pill-selected' : ''} onClick={() => setStatusFilter(status)}>{status}</button>)}<span className="filter-divider" /><span>Label</span><button className={labelFilter === 'All' ? 'filter-pill-selected' : ''} onClick={() => setLabelFilter('All')}>All</button>{allLabelsInScope.map((label) => <button key={label} className={labelFilter === label ? 'filter-pill-selected' : ''} onClick={() => setLabelFilter(label)}>{label}</button>)}<button className="clear-filter" onClick={() => { setStatusFilter('All'); setLabelFilter('All'); }}>Clear</button></div>}
              <div className="table-head"><span className="issue-col">Issue</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due date</span></div>
              <div className="issue-list">{filteredIssues.length === 0 ? <div className="empty-state"><Search size={20} /><strong>No issues found</strong><span>Try a different search or filter.</span></div> : pageIssues.map((issue) => <button key={issue.id} className={`issue-row ${selectedId === issue.id ? 'selected-row' : ''}`} onClick={() => setSelectedId(issue.id)}><div className="issue-main"><StatusIcon status={issue.status} /><div><div className="issue-title"><strong>{issue.title}</strong>{issue.comments > 0 && <span className="comment-count">{issue.comments}</span>}</div><div className="issue-meta"><span>{issue.id}</span>{issue.labels.map((label) => <span key={label} className="label-chip">{label}</span>)}</div></div></div><div className="issue-status"><StatusIcon status={issue.status} /><span>{issue.status}</span></div><div className="issue-priority"><PriorityIcon priority={issue.priority} /><span>{issue.priority}</span></div><div className="issue-assignee"><div className={`avatar avatar-tiny ${issue.avatar}`}>{issue.initials}</div><span>{issue.assignee}</span></div><div className="issue-due"><CalendarDays size={14} /><span className={issue.due === 'Today' ? 'due-today' : ''}>{issue.due}</span></div></button>)}</div>
              <div className="table-footer"><span>Showing {filteredIssues.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + pageSize, filteredIssues.length)} of {filteredIssues.length} {view === 'My issues' ? 'assigned to you' : teamScope === 'All teams' ? 'workspace' : activeTeam} issue{filteredIssues.length === 1 ? '' : 's'}</span><div className="pager">{totalPages > 1 && <><button className="pager-button" disabled={safePage === 1} onClick={() => setPage(1)} aria-label="First page">«</button><button className="pager-button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous page">‹</button><div className="pager-pages">{Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} className={`pager-page ${pageNumber === safePage ? 'pager-page-active' : ''}`} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}</div><button className="pager-button" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} aria-label="Next page">›</button><button className="pager-button" disabled={safePage === totalPages} onClick={() => setPage(totalPages)} aria-label="Last page">»</button></>}<button className="footer-link" onClick={() => { setView('All issues'); setTeamScope('All teams'); setStatusFilter('All'); setQuery(''); }}>View all issues <ArrowUp size={13} className="rotate-45" /></button></div></div>
            </section>
          </>}
        </div>
      </main>

      {selectedIssue && view !== 'Activity' && <aside className="detail-panel"><div className="detail-top"><span className="detail-id">{selectedIssue.id}</span><div><button className="icon-button" aria-label="More"><MoreHorizontal size={17} /></button><button className="icon-button" onClick={() => setSelectedId('')} aria-label="Close"><X size={17} /></button></div></div><div className="detail-body"><div className="detail-title-row"><PriorityIcon priority={selectedIssue.priority} /><h2>{selectedIssue.title}</h2></div><div className="detail-properties"><label className="status-control"><StatusIcon status={selectedIssue.status} /><select value={selectedIssue.status} onChange={(event) => changeStatus(event.target.value as Status)} aria-label="Change issue status"><option value={selectedIssue.status}>{selectedIssue.status}</option>{allowedStatusTransitions[selectedIssue.status].map((status) => <option key={status} value={status}>{status}</option>)}</select><ChevronDown size={14} /></label><button><div className={`avatar avatar-tiny ${selectedIssue.avatar}`}>{selectedIssue.initials}</div><span>{selectedIssue.assignee}</span><ChevronDown size={14} /></button><button><CalendarDays size={15} /><span>{selectedIssue.due}</span><ChevronDown size={14} /></button></div><p className="detail-description">{selectedIssue.description}</p><div className="detail-labels">{selectedIssue.labels.map((label) => <span key={label} className="label-chip removable">{label}<button onClick={() => removeLabelFromSelected(label)} aria-label={`Remove ${label} label`}><X size={11} /></button></span>)}<div className="add-label-wrap"><button className="add-label" onClick={() => { setShowLabelMenu((current) => !current); setLabelQuery(''); }}><Plus size={13} /> Add label</button>{showLabelMenu && <div className="label-menu"><div className="label-menu-search"><Search size={13} /><input autoFocus value={labelQuery} onChange={(event) => setLabelQuery(event.target.value)} placeholder="Search labels..." /></div><div className="label-menu-list">{labelMenuMatches.length === 0 ? <span className="label-menu-empty">No labels match “{labelQuery}”.</span> : labelMenuMatches.map((label) => <button key={label} className="label-menu-item" onClick={() => { addLabelToSelected(label); setLabelQuery(''); }}><span className="label-chip">{label}</span><Plus size={12} /></button>)}</div></div>}</div></div><div className="detail-divider" /><div className="detail-section-title"><span>Activity</span><button>Subscribe</button></div><div className="detail-activity"><div className="activity-line"><div className="avatar avatar-tiny bg-[#dce8ff] text-[#3157a4]">MC</div><div><p><strong>Maya Chen</strong> changed status to <b>{selectedIssue.status}</b></p><small>{selectedIssue.updated}</small></div></div><div className="activity-line"><div className="activity-icon"><MessageIcon /></div><div><p><strong>Jordan Lee</strong> added a comment</p><blockquote>“I’m looking into the related requests now. Will share an update shortly.”</blockquote><small>48 min ago</small></div></div></div></div><div className="detail-footer"><button onClick={openEdit}><Settings size={15} /> Edit issue</button><span>Last updated {selectedIssue.updated}</span></div></aside>}
      {showHelp && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHelp(false); }}><div className="info-modal"><div className="modal-header"><div><span className="modal-kicker">Workspace help</span><h2>Keep work moving</h2></div><button className="icon-button" onClick={() => setShowHelp(false)} aria-label="Close help"><X size={18} /></button></div><div className="info-modal-body"><p>Use team views to focus the queue, then open an issue to review its owner, status, due date, and activity.</p><div className="help-shortcuts"><span><kbd>⌘ K</kbd> Search issues</span><span><kbd>C</kbd> Create an issue</span><span><kbd>Esc</kbd> Close a panel</span></div></div></div></div>}
      {showNotifications && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNotifications(false); }}><div className="info-modal"><div className="modal-header"><div><span className="modal-kicker">Notifications</span><h2>Recent updates</h2></div><button className="icon-button" onClick={() => setShowNotifications(false)} aria-label="Close notifications"><X size={18} /></button></div><div className="info-modal-body"><div className="notification-item"><span className="notification-dot" /><div><strong>Jordan Lee updated a finance issue</strong><small>34 minutes ago</small></div></div><div className="notification-item"><span className="notification-dot notification-dot-muted" /><div><strong>A support escalation needs an owner</strong><small>3 hours ago</small></div></div></div></div></div>}
      {showProfile && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowProfile(false); }}><div className="info-modal"><div className="modal-header"><div><span className="modal-kicker">Account</span><h2>Your account</h2></div><button className="icon-button" onClick={() => setShowProfile(false)} aria-label="Close account"><X size={18} /></button></div><div className="info-modal-body"><div className="account-summary"><div className="avatar avatar-small bg-[#d9f3e7] text-[#257957]">YO</div><div><strong>You</strong><span>you@newtonite.co</span></div></div><button className="account-action" onClick={() => setShowProfile(false)}><Settings size={15} /> Account settings</button><button className="account-action" onClick={() => setShowProfile(false)}><Moon size={15} /> Appearance is available above</button></div></div></div>}
      {showEdit && selectedIssue && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowEdit(false); }}><div className="create-modal"><div className="modal-header"><div><span className="modal-kicker">Edit issue</span><h2>{selectedIssue.id}</h2></div><button className="icon-button" onClick={() => setShowEdit(false)} aria-label="Close"><X size={18} /></button></div><div className="editor-fields"><input autoFocus className="title-input" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="Issue title" /><textarea className="editor-textarea" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} placeholder="Add context, impact, and next steps..." /><div className="editor-grid"><label className="editor-field"><span>Status</span><select className="editor-control" value={editStatus} onChange={(event) => setEditStatus(event.target.value as Status)}><option value={editStatus}>{editStatus}</option>{allowedStatusTransitions[selectedIssue.status].map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className="editor-field"><span>Priority</span><select className="editor-control" value={editPriority} onChange={(event) => setEditPriority(event.target.value as Priority)}>{(['Urgent', 'High', 'Medium', 'Low'] as Priority[]).map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label><label className="editor-field"><span>Team</span><select className="editor-control" value={editTeam} onChange={(event) => setEditTeam(event.target.value as TeamName)}>{(['Operations', 'Finance', 'Support'] as TeamName[]).map((team) => <option key={team} value={team}>{team}</option>)}</select></label><label className="editor-field"><span>Assignee</span><select className="editor-control" value={editAssignee} onChange={(event) => setEditAssignee(event.target.value)}>{['You', 'Maya Chen', 'Jordan Lee', 'Ari Smith', 'Noah Williams', 'Nia Patel'].map((assignee) => <option key={assignee} value={assignee}>{assignee}</option>)}</select></label></div><label className="editor-field"><span>Due date</span><input className="editor-control" disabled={selectedIssue.priority === 'Urgent' || editPriority === 'Urgent'} value={editDue} onChange={(event) => setEditDue(event.target.value)} placeholder="Today, Thu Oct 17, or leave blank" />{(selectedIssue.priority === 'Urgent' || editPriority === 'Urgent') && <small className="editor-note">Urgent issues cannot be rescheduled.</small>}</label><div className="editor-field editor-field-full"><span>Labels</span><div className="label-editor">{editLabels.map((label) => <span key={label} className="label-chip removable">{label}<button onClick={() => setEditLabels((current) => current.filter((item) => item !== label))} aria-label={`Remove ${label}`}><X size={11} /></button></span>)}{labelPresets.filter((label) => !editLabels.includes(label)).map((label) => <button key={label} className="label-add-chip" onClick={() => setEditLabels((current) => [...current, label])}><Plus size={11} /> {label}</button>)}</div></div>{editError && <p className="editor-error">{editError}</p>}</div><div className="modal-footer"><span>Changes update this issue</span><button className="primary-button" onClick={saveEdit}>Save changes</button></div></div></div>}
      {showCreate && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}><div className="create-modal"><div className="modal-header"><div><span className="modal-kicker">New issue</span><h2>What needs to happen?</h2></div><button className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={18} /></button></div><div className="editor-fields"><input autoFocus className="title-input" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Give this issue a clear title..." /><textarea className="editor-textarea" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Add context, impact, and next steps..." /><div className="editor-grid"><label className="editor-field"><span>Status</span><select className="editor-control" value={newStatus} onChange={(event) => setNewStatus(event.target.value as Status)}><option value="Backlog">Backlog</option><option value="Todo">Todo</option></select></label><label className="editor-field"><span>Priority</span><select className="editor-control" value={newPriority} onChange={(event) => setNewPriority(event.target.value as Priority)}>{(['Urgent', 'High', 'Medium', 'Low'] as Priority[]).map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label><label className="editor-field"><span>Team</span><select className="editor-control" value={newTeam} onChange={(event) => setNewTeam(event.target.value as TeamName)}>{(['Operations', 'Finance', 'Support'] as TeamName[]).map((team) => <option key={team} value={team}>{team}</option>)}</select></label><label className="editor-field"><span>Assignee</span><select className="editor-control" value={newAssignee} onChange={(event) => setNewAssignee(event.target.value)}>{['You', 'Maya Chen', 'Jordan Lee', 'Ari Smith', 'Noah Williams', 'Nia Patel'].map((assignee) => <option key={assignee} value={assignee}>{assignee}</option>)}</select></label></div><label className="editor-field"><span>Due date</span><input className="editor-control" value={newDue} onChange={(event) => setNewDue(event.target.value)} placeholder="Today, Thu Oct 17, or leave blank" /></label><div className="editor-field editor-field-full"><span>Labels</span><div className="label-editor">{newLabels.map((label) => <span key={label} className="label-chip removable">{label}<button onClick={() => setNewLabels((current) => current.filter((item) => item !== label))} aria-label={`Remove ${label}`}><X size={11} /></button></span>)}{labelPresets.filter((label) => !newLabels.includes(label)).map((label) => <button key={label} className="label-add-chip" onClick={() => setNewLabels((current) => [...current, label])}><Plus size={11} /> {label}</button>)}</div></div></div><div className="modal-footer"><span><Command size={13} /> Enter to create</span><button className="primary-button" onClick={createIssue}>Create issue</button></div></div></div>}
    </div>
  );
}

function MessageIcon() { return <span className="message-icon"><span /><span /><span /></span>; }

function formatToday(date: Date) {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday}, ${month} ${date.getDate()}, ${date.getFullYear()}`;
}

function ActivityView() {
  return <section className="activity-card"><div className="activity-card-header"><div><h2>Recent activity</h2><p>A live view of the latest changes in your workspace.</p></div></div><div className="activity-feed">{activity.map((item) => <div className="feed-item" key={`${item.name}-${item.time}`}><div className={`avatar avatar-small ${item.avatar}`}>{item.initials}</div><div className="feed-copy"><p><strong>{item.name}</strong> {item.action} <b>{item.target}</b> {item.detail && <span>{item.detail}</span>}</p><small>{item.time}</small></div><div className="feed-type"><Activity size={14} /></div></div>)}</div></section>;
}

export default App;
