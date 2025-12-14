import crypto from 'node:crypto';

export default class ProjectService {
  constructor(db) {
    this.db = db;
  }

  listProjects() {
    const data = this.db.read();
    this.ensureIssued(data);
    return data.projects;
  }

  getProjectByName(name) {
    const data = this.db.read();
    this.ensureIssued(data);
    return data.projects.find((p) => p.name.toLowerCase() === name.toLowerCase());
  }

  createProject(name, link) {
    const data = this.db.read();
    this.ensureIssued(data);
    if (data.projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Проект с таким названием уже существует');
    }
    const newProject = {
      name,
      link,
      ids: this.generateIds(data, 30),
      issued: [],
      createdAt: new Date().toISOString()
    };
    data.projects.push(newProject);
    this.db.write(data);
    return newProject;
  }

  updateProject(name, updates) {
    const data = this.db.read();
    this.ensureIssued(data);
    const project = data.projects.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (!project) {
      throw new Error('Проект не найден');
    }
    if (
      updates.name &&
      data.projects.some(
        (p) => p.name.toLowerCase() === updates.name.toLowerCase() && p.name.toLowerCase() !== name.toLowerCase()
      )
    ) {
      throw new Error('Проект с таким названием уже есть');
    }
    if (updates.name) {
      project.name = updates.name;
    }
    if (updates.link) {
      project.link = updates.link;
    }
    this.db.write(data);
    return project;
  }

  deleteProjectByName(name) {
    const data = this.db.read();
    this.ensureIssued(data);
    const index = data.projects.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    if (index === -1) {
      throw new Error('Проект не найден');
    }
    const [deleted] = data.projects.splice(index, 1);
    this.db.write(data);
    return deleted;
  }

  consumeId(id) {
    const data = this.db.read();
    this.ensureIssued(data);
    const project = data.projects.find((p) => (p.ids || []).includes(id) || (p.issued || []).includes(id));
    if (!project) {
      return null;
    }
    if (project.issued?.includes(id)) {
      project.issued = project.issued.filter((item) => item !== id);
    } else {
      project.ids = project.ids.filter((item) => item !== id);
    }
    const newId = this.generateUniqueId(data);
    project.ids.push(newId);
    this.db.write(data);
    return { project, deliveredId: id };
  }

  firstFreeId(projectName) {
    const data = this.db.read();
    this.ensureIssued(data);
    const project = data.projects.find((p) => p.name.toLowerCase() === projectName.toLowerCase());
    return project?.ids[0] || null;
  }

  consumeFirstId(projectName) {
    const data = this.db.read();
    this.ensureIssued(data);
    const project = data.projects.find((p) => p.name.toLowerCase() === projectName.toLowerCase());
    if (!project || !project.ids.length) return null;
    const issued = project.ids.shift();
    if (!project.issued) project.issued = [];
    project.issued.push(issued);
    const newId = this.generateUniqueId(data);
    project.ids.push(newId);
    this.db.write(data);
    return { project, issued };
  }

  generateIds(data, count) {
    const ids = [];
    while (ids.length < count) {
      const newId = this.generateUniqueId(data, ids);
      ids.push(newId);
    }
    return ids;
  }

  generateUniqueId(data, localReserved = []) {
    this.ensureIssued(data);
    const existing = new Set(
      data.projects
        .flatMap((p) => [...(p.ids || []), ...(p.issued || [])])
        .concat(localReserved || [])
    );
    let candidate;
    do {
      candidate = crypto.randomBytes(4).toString('hex').toUpperCase();
    } while (existing.has(candidate));
    return candidate;
  }

  ensureIssued(data) {
    if (!data?.projects) return;
    data.projects.forEach((p) => {
      if (!p.issued) p.issued = [];
    });
  }
}
