const pm = require('../../dist/helpers/projectManagement');

describe('pm.checkForXray', () => {
  it('should mark projects with category "XRAY" as Xray projects', () => {
    const jiraProjects = [
      { name: 'Project1', projectCategory: { name: 'XRAY' } },
      { name: 'Project2', projectCategory: { name: 'Other' } },
    ];
    const result = pm.checkForXray(jiraProjects);
    expect(result[0].isXray).toBe(true);
    expect(result[1].isXray).toBe(false);
  });

  it('should mark projects without category "XRAY" as non-Xray projects', () => {
    const jiraProjects = [
      { name: 'Project1', projectCategory: { name: 'Other' } },
      { name: 'Project2', projectCategory: { name: 'Another' } },
    ];
    const result = pm.checkForXray(jiraProjects);
    expect(result[0].isXray).toBe(false);
    expect(result[1].isXray).toBe(false);
  });

  it('should mark projects without a category as non-Xray projects', () => {
    const jiraProjects = [
      { name: 'Project1' },
      { name: 'Project2', projectCategory: { name: 'XRAY' } },
    ];
    const result = pm.checkForXray(jiraProjects);
    expect(result[0].isXray).toBe(false);
    expect(result[1].isXray).toBe(true);
  });
});