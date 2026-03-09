const { useState, useEffect, useRef } = React;

function extractMarkdownUrl(text) {
    const m = text.match(/\((https?:\/\/[^)]+)\)/);
    return m ? m[1] : null;
}

function parseProjects(markdown) {
    const blocks = markdown.split('\n---\n');
    const projects = [];

    blocks.forEach((block, idx) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) return;

        const titleLine = lines.find(l => l.startsWith('## Project:')) || lines[0];
        const title = titleLine.replace('## Project:', '').trim();

        const project = {
            id: `p-${idx}-${Date.now()}`,
            title,
            raw: block,
        };

        lines.forEach(line => {
            if (line.startsWith('**Industries:**')) project.industries = line.replace('**Industries:**', '').trim();
            if (line.startsWith('**Technology:**')) project.technology = line.replace('**Technology:**', '').trim();
            if (line.startsWith('**Current State:**')) project.currentState = line.replace('**Current State:**', '').trim();
            if (line.startsWith('**Next Step:**')) project.nextStep = line.replace('**Next Step:**', '').trim();
            if (line.startsWith('**Prototype:**')) {
                const raw = line.replace('**Prototype:**', '').trim();
                project.prototype = extractMarkdownUrl(raw) || raw;
            }
            if (line.startsWith('**Link:**')) {
                const raw = line.replace('**Link:**', '').trim();
                project.link = extractMarkdownUrl(raw) || raw;
            }
            if (line.startsWith('**Tags:**')) project.tags = line.replace('**Tags:**', '').trim().split(',').map(t => t.trim()).filter(Boolean);
        });

        // Map currentState to a board column id
        project.status = mapStateToColumn(project.currentState);

        projects.push(project);
    });

    return projects;
}

function mapStateToColumn(currentState) {
    if (!currentState) return 'ideas';
    const cs = currentState.toLowerCase();
    if (cs.includes('ideat') || cs.includes('ideation')) return 'ideas';
    if (cs.includes('discovery') || cs.includes('research')) return 'discovery';
    if (cs.includes('prototype') || cs.includes('prototype')) return 'prototyping';
    if (cs.includes('working') || cs.includes('iterat') || cs.includes('weekly') || cs.includes('user research')) return 'weekly';
    if (cs.includes('paused')) return 'paused';
    if (cs.includes('stopped') || cs.includes('>1yr')) return 'stopped';
    return 'ideas';
}

const COLUMNS = [
    { id: 'ideas', name: 'Ideas' },
    { id: 'discovery', name: 'Discovery' },
    { id: 'prototyping', name: 'Prototyping' },
    { id: 'weekly', name: 'Weekly Progress' },
    { id: 'paused', name: 'Paused' },
    { id: 'stopped', name: 'Stopped (>1yr)' }
];

function ProjectCard({ project, onDragStart, highlighted }) {
    return (
        <div
            className={`card ${highlighted ? 'highlight' : ''}`}
            data-tags={(project.tags || []).join(',')}
            draggable
            onDragStart={(e) => onDragStart(e, project.id)}
            aria-grabbed="false"
        >
            <div className="card-title">{project.title}</div>
            <div className="card-body">
                {project.industries && <div className="muted">{project.industries}</div>}
                {project.technology && <div className="muted">Tech: {project.technology}</div>}
                {project.currentState && <div className="muted">State: {project.currentState}</div>}
                {project.tags && <div className="tags">{project.tags.join(', ')}</div>}
            </div>
            <div className="card-links">
                {project.prototype && <a href={project.prototype} target="_blank" rel="noreferrer">Prototype</a>}
                {project.link && <a href={project.link} target="_blank" rel="noreferrer">Link</a>}
            </div>
        </div>
    );
}

function Column({ column, projects, onDropProject, onDragOverColumn, onDragLeaveColumn }) {
    return (
        <section
            className="column"
            onDragOver={(e) => onDragOverColumn(e, column.id)}
            onDrop={(e) => onDropProject(e, column.id)}
            onDragLeave={(e) => onDragLeaveColumn(e, column.id)}
            aria-labelledby={`col-${column.id}`}
        >
            <div className="column-header" id={`col-${column.id}`}>
                <h3>{column.name}</h3>
            </div>
            <div className="column-body">
                {projects.map(p => (
                    <ProjectCard key={p.id} project={p} onDragStart={(e, id) => e.dataTransfer.setData('text/plain', id)} highlighted={p._highlighted} />
                ))}
            </div>
        </section>
    );
}

function App() {
    const [projects, setProjects] = useState([]);
    const [error, setError] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);
    const highlightTimer = useRef(null);

    useEffect(() => {
        let mounted = true;
        // Prefer inline JS markdown (window.PROJECTS_MD) as authoritative when present
        if (window && window.PROJECTS_MD) {
            try {
                const parsed = parseProjects(window.PROJECTS_MD);
                if (mounted) setProjects(parsed);
            } catch (e) {
                console.error('Failed to parse inline PROJECTS_MD', e);
                if (mounted) setError('Failed to parse inline PROJECTS_MD');
            }
        } else {
            // otherwise try fetching the markdown file from the server
            fetch('./data/projects.md')
                .then(r => r.text())
                .then(text => {
                    if (!mounted) return;
                    const parsed = parseProjects(text);
                    setProjects(parsed);
                })
                .catch(err => {
                    console.warn('Could not fetch projects.md and no inline data present', err);
                    if (mounted) setError(err.message || 'Failed to load projects');
                });
        }

        return () => { mounted = false; };
    }, []);

    const onDragStart = (e, projectId) => {
        e.dataTransfer.setData('text/plain', projectId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOverColumn = (e, colId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colId);
    };

    const onDragLeaveColumn = (e, colId) => {
        e.preventDefault();
        setDragOverCol(null);
    };

    const onDropProject = (e, colId) => {
        e.preventDefault();
        const projectId = e.dataTransfer.getData('text/plain');
        if (!projectId) return;
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: colId } : p));
        setDragOverCol(null);
    };

    const grouped = COLUMNS.reduce((acc, col) => {
        acc[col.id] = projects.filter(p => p.status === col.id);
        return acc;
    }, {});

    // compute top tags
    const tagCounts = projects.reduce((acc, p) => {
        (p.tags || []).forEach(t => { acc[t] = (acc[t] || 0) + 1; });
        return acc;
    }, {});
    const topTags = Object.entries(tagCounts)
        .sort((a,b) => b[1] - a[1])
        .slice(0,10)
        .map(([tag,count]) => ({ tag, count }));
    // click handler: highlight matching cards for 1s
    const onTagClick = (tag) => {
    // DOM-based highlight for robustness when opened via file://

        // clear any existing timer
        if (highlightTimer.current) {
            clearTimeout(highlightTimer.current);
            highlightTimer.current = null;
        }

        // Add highlight class to matching card DOM nodes
        try {
            const cards = Array.from(document.querySelectorAll('.card'));
            const matched = cards.filter(c => {
                const t = c.getAttribute('data-tags') || '';
                return t.split(',').map(s => s.trim()).filter(Boolean).includes(tag);
            });

            matched.forEach(c => c.classList.add('highlight'));

            // remove highlight after 2s
            highlightTimer.current = setTimeout(() => {
                matched.forEach(c => c.classList.remove('highlight'));
                highlightTimer.current = null;
            }, 2000);
        } catch (e) {
            console.error('DOM highlighting failed', e);
            // no-op
        }
    };

    return (
            <div className="board-root">
                <div className="site-header">
                    <h1 className="site-title">alter<span className="site-dot" aria-hidden="true"></span>is product studio</h1>
                </div>
                <header className="board-header">
                    <h1>project status</h1>
                    <div className="top-tags" aria-label="popular tags">
                        {topTags.map(t => (
                            <button key={t.tag} className="tag-pill" title={`${t.count} projects`} onClick={() => onTagClick(t.tag)}>{t.tag}</button>
                        ))}
                    </div>
                </header>
            <div className="board">
                {COLUMNS.map(col => (
                    <div key={col.id} className={`column-wrap ${dragOverCol === col.id ? 'drag-over' : ''}`}>
                        <Column
                            column={col}
                            projects={grouped[col.id] || []}
                            onDropProject={onDropProject}
                            onDragOverColumn={onDragOverColumn}
                            onDragLeaveColumn={onDragLeaveColumn}
                        />
                    </div>
                ))}
            </div>
            {error && <div className="error">{error}</div>}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);