package servlet;

import com.atlassian.jira.bc.issue.IssueService;
import com.atlassian.jira.bc.issue.search.SearchService;
import com.atlassian.jira.bc.project.ProjectService;
import com.atlassian.jira.config.ConstantsManager;
import com.atlassian.jira.issue.Issue;
import com.atlassian.jira.issue.IssueInputParameters;
import com.atlassian.jira.issue.MutableIssue;
import com.atlassian.jira.issue.issuetype.IssueType;
import com.atlassian.jira.issue.search.SearchException;
import com.atlassian.jira.issue.search.SearchResults;
import com.atlassian.jira.jql.builder.JqlClauseBuilder;
import com.atlassian.jira.jql.builder.JqlQueryBuilder;
import com.atlassian.jira.project.Project;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.jira.user.ApplicationUser;
import com.atlassian.jira.web.bean.PagerFilter;
import com.atlassian.plugin.spring.scanner.annotation.component.Scanned;
import com.atlassian.plugin.spring.scanner.annotation.imports.JiraImport;
import com.atlassian.query.Query;
import com.atlassian.templaterenderer.TemplateRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Scanned
public class IssueCRUD extends HttpServlet {
    private static final Logger log = LoggerFactory.getLogger(IssueCRUD.class);

    @JiraImport
    private IssueService issueService;
    @JiraImport
    private ProjectService projectService;
    @JiraImport
    private SearchService searchService;
    @JiraImport
    private TemplateRenderer templateRenderer;
    @JiraImport
    private JiraAuthenticationContext authenticationContext;
    @JiraImport
    private ConstantsManager constantsManager;

    private static final String LIST_ISSUES_TEMPLATE = "/templates/list.vm";
    private static final String NEW_ISSUE_TEMPLATE = "/templates/new.vm";
    private static final String EDIT_ISSUE_TEMPLATE = "/templates/edit.vm";

    public IssueCRUD(IssueService issueService, ProjectService projectService,
                     SearchService searchService,
                     TemplateRenderer templateRenderer,
                     JiraAuthenticationContext authenticationContext,
                     ConstantsManager constantsManager) {
        this.issueService = issueService;
        this.projectService = projectService;
        this.searchService = searchService;
        this.templateRenderer = templateRenderer;
        this.authenticationContext = authenticationContext;
        this.constantsManager = constantsManager;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = Optional.ofNullable(req.getParameter("actionType")).orElse("");

        Map<String, Object> context = new HashMap<>();
        resp.setContentType("text/html;charset=utf-8");
        switch (action) {
            case "new":
                templateRenderer.render(NEW_ISSUE_TEMPLATE, context, resp.getWriter());
                break;
            case "edit":
                IssueService.IssueResult issueResult = issueService.getIssue(authenticationContext.getLoggedInUser(),
                        req.getParameter("key"));
                context.put("issue", issueResult.getIssue());
                templateRenderer.render(EDIT_ISSUE_TEMPLATE, context, resp.getWriter());
                break;
            default:
                List<Issue> issues = getIssues();
                context.put("issues", issues);
                templateRenderer.render(LIST_ISSUES_TEMPLATE, context, resp.getWriter());
        }

    }

    /**
     * Retrieve issues using simple JQL query project="TUTORIAL"
     * Pagination is set to unlimited
     *
     * @return List of issues
     */
    private List<Issue> getIssues() {

        ApplicationUser user = authenticationContext.getLoggedInUser();
        JqlClauseBuilder jqlClauseBuilder = JqlQueryBuilder.newClauseBuilder();
        Query query = jqlClauseBuilder.project("TUTORIAL").buildQuery();
        PagerFilter pagerFilter = PagerFilter.getUnlimitedFilter();

        SearchResults searchResults = null;
        try {
            searchResults = searchService.search(user, query, pagerFilter);
        } catch (SearchException e) {
            e.printStackTrace();
        }
        return searchResults != null ? searchResults.getIssues() : null;
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String actionType = req.getParameter("actionType");

        switch (actionType) {
            case "edit":
                handleIssueEdit(req, resp);
                break;
            case "new":
                handleIssueCreation(req, resp);
                break;
            default:
                resp.sendError(HttpServletResponse.SC_NOT_FOUND);
        }
    }

    private void handleIssueEdit(HttpServletRequest req, HttpServletResponse resp) throws IOException {

        ApplicationUser user = authenticationContext.getLoggedInUser();

        Map<String, Object> context = new HashMap<>();

        IssueInputParameters issueInputParameters = issueService.newIssueInputParameters();
        issueInputParameters.setSummary(req.getParameter("summary"))
                .setDescription(req.getParameter("description"));

        MutableIssue issue = issueService.getIssue(user, req.getParameter("key")).getIssue();

        IssueService.UpdateValidationResult result =
                issueService.validateUpdate(user, issue.getId(), issueInputParameters);

        if (result.getErrorCollection().hasAnyErrors()) {
            context.put("issue", issue);
            context.put("errors", result.getErrorCollection().getErrors());
            resp.setContentType("text/html;charset=utf-8");
            templateRenderer.render(EDIT_ISSUE_TEMPLATE, context, resp.getWriter());
        } else {
            issueService.update(user, result);
            resp.sendRedirect("issuecrud");
        }
    }

    private void handleIssueCreation(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ApplicationUser user = authenticationContext.getLoggedInUser();

        Map<String, Object> context = new HashMap<>();

        Project project = projectService.getProjectByKey(user, "TUTORIAL").getProject();

        if (project == null) {
            context.put("errors", Collections.singletonList("Project doesn't exist"));
            templateRenderer.render(LIST_ISSUES_TEMPLATE, context, resp.getWriter());
            return;
        }

        IssueType taskIssueType = constantsManager.getAllIssueTypeObjects().stream().filter(
                issueType -> issueType.getName().equalsIgnoreCase("task")).findFirst().orElse(null);

        if(taskIssueType == null) {
            context.put("errors", Collections.singletonList("Can't find Task issue type"));
            templateRenderer.render(LIST_ISSUES_TEMPLATE, context, resp.getWriter());
            return;
        }

        IssueInputParameters issueInputParameters = issueService.newIssueInputParameters();
        issueInputParameters.setSummary(req.getParameter("summary"))
                .setDescription(req.getParameter("description"))
                .setAssigneeId(user.getName())
                .setReporterId(user.getName())
                .setProjectId(project.getId())
                .setIssueTypeId(taskIssueType.getId());

        IssueService.CreateValidationResult result = issueService.validateCreate(user, issueInputParameters);

        if (result.getErrorCollection().hasAnyErrors()) {
            List<Issue> issues = getIssues();
            context.put("issues", issues);
            context.put("errors", result.getErrorCollection().getErrors());
            resp.setContentType("text/html;charset=utf-8");
            templateRenderer.render(LIST_ISSUES_TEMPLATE, context, resp.getWriter());
        } else {
            issueService.create(user, result);
            resp.sendRedirect("issuecrud");
        }
    }


    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        ApplicationUser user = authenticationContext.getLoggedInUser();
        String respStr;
        IssueService.IssueResult issueResult = issueService.getIssue(user, req.getParameter("key"));
        if (issueResult.isValid()) {
            IssueService.DeleteValidationResult result = issueService.validateDelete(user, issueResult.getIssue().getId());
            if (result.getErrorCollection().hasAnyErrors()) {
                respStr = "{ \"success\": \"false\", error: \"" + result.getErrorCollection().getErrors().get(0) + "\" }";
            } else {
                issueService.delete(user, result);
                respStr = "{ \"success\" : \"true\" }";
            }
        } else {
            respStr = "{ \"success\" : \"false\", error: \"Couldn't find issue\"}";
        }
        resp.setContentType("application/json;charset=utf-8");
        resp.getWriter().write(respStr);
    }
}
