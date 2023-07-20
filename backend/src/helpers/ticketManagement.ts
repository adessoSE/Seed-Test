

function addLabelToIssue(githubName: string, githubRepo: string, password: string, issueNumber, label: string) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels`;
	const body = { labels: [label] };
	const auth = `Basic ${Buffer.from(`${githubName}:${password}`, 'binary').toString('base64')}`;
	fetch(link, {
		method: 'post',
		body: JSON.stringify(body),
		headers: { Authorization: auth, 'Content-Type': 'application/json' }
	})
}

function removeLabelOfIssue(githubName: string, githubRepo: string, password: string, issueNumber, label: string) {
	const link = `https://api.github.com/repos/${githubName}/${githubRepo}/issues/${issueNumber}/labels/${label}`;
	const auth = `Basic ${Buffer.from(`${githubName}:${password}`, 'binary').toString('base64')}`;
	fetch(link, {
		method: 'post',
		headers: { Authorization: auth, 'Content-Type': 'application/json' }
	})
}

function updateLabel(testStatus: boolean, githubName: string, githubRepo: string, githubToken: string, issueNumber) {
	let removeLabel;
	let addedLabel;
	if (testStatus) {
		removeLabel = 'Seed-Test Test Fail :x:';
		addedLabel = 'Seed-Test Test Success :white_check_mark:';
	} else {
		removeLabel = 'Seed-Test Test Success :white_check_mark:';
		addedLabel = 'Seed-Test Test Fail :x:';
	}
	removeLabelOfIssue(githubName, githubRepo, githubToken, issueNumber, removeLabel);
	addLabelToIssue(githubName, githubRepo, githubToken, issueNumber, addedLabel);
}

export {
    addLabelToIssue,
    removeLabelOfIssue,
    updateLabel,
};