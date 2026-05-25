import { useStore } from '../state/store';
import { CollapsibleCard } from './CollapsibleCard';

export function ProjectPanel() {
  const projects = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const projectName = useStore((s) => s.projectName);
  const newProject = useStore((s) => s.newProject);
  const switchProject = useStore((s) => s.switchProject);
  const renameProject = useStore((s) => s.renameProject);
  const deleteProject = useStore((s) => s.deleteProject);

  const handleNewProject = () => {
    const name = window.prompt('Project name', 'Untitled project');
    if (name !== null) newProject(name);
  };

  const handleRename = () => {
    const name = window.prompt('Project name', projectName);
    if (name !== null) renameProject(name);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${projectName}"?`)) {
      deleteProject(activeProjectId);
    }
  };

  return (
    <CollapsibleCard title="Project">
      <div className="panel-stack">
        <label className="field-row">
          <span>Current</span>
          <select
            className="option-select"
            aria-label="Project"
            value={activeProjectId}
            onChange={(event) => switchProject(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <div className="button-row">
          <button className="btn-sm" onClick={handleNewProject}>
            New
          </button>
          <button className="btn-sm" onClick={handleRename}>
            Rename
          </button>
          <button className="btn-sm danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
    </CollapsibleCard>
  );
}
