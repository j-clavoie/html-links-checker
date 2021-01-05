const vscode = require('vscode');
const genFunc = require('./genericFunctions');
//const needle = require('needle');
const urllib = require('urllib'); // https://www.npmjs.com/package/urllib
const JSDOM = require('jsdom').JSDOM;


// Create a new Collection for Diagnostics
// A Diagnostics Collection must be outsides of an function.
const links_checker_diagColl = vscode.languages.createDiagnosticCollection("html-link-checker");

// Use to clear the "Problems" Tab when we close the file
vscode.workspace.onDidCloseTextDocument(function (listener) {
	// clear all previous diagnostics of the closed editor
	links_checker_diagColl.delete(listener.uri);
	links_checker_diagColl.set(listener.uri, undefined);
});


/** ***********************************************************************************************
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let disposable = vscode.commands.registerCommand('html-links-checker.start', function () {
		links_checker_diagColl.set(vscode.window.activeTextEditor.document.uri, []);
		// Main process - Validate all URL 
		mainValidationProcess();
	});


	// add main function to context array
	context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() { }

module.exports = {
	activate,
	deactivate
}

/* ############################################################################ */
/* ############################################################################ */
/* ############################################################################ */
/* ############################################################################ */

/** ***********************************************************************************************
 * Object to put Links report informations for analyze
 */
class LinkResult {
	/**
	* @param {String} link The URL to analyze (really used only with redirection)
	* @param {Number} statusCode The status code returned by the server
	* @param {Boolean} hasError This link has error
	* @param {Boolean} redirected This link is redirected (default: False)
	* @param {String} redirectionLink The new URL if redirected
		**/
	constructor(link, statusCode, hasError, redirected, redirectionLink) {
		this.link = link;
		this.statusCode = statusCode || 0;
		this.hasError = hasError || false;
		this.redirected = redirected || false;
		this.redirectionLink = redirectionLink || undefined;
	}
}

/** ***********************************************************************************************
 * Object Diagnostic.
 */
class linkDiagnostic {
	/**
	 * 
	 * @param {Number} code 
	 * @param {String} message 
	 * @param {vscode.Range} range 
	 * @param {vscode.DiagnosticSeverity} severity 
	 */
	constructor(code, message, range, severity) {
		this.code = code || 0,
			this.message = message || '',
			this.range = range || undefined,
			this.severity = severity || vscode.DiagnosticSeverity.Error,
			this.source = "HTML Links Checker"
	}
}

/** ***********************************************************************************************
 * My personnal Types of URL
 */
const URLType = {
	isEmpty: 1,
	isNameless: 2,
	isExcluded: 3,
	isExternal: 4,
	isInternal: 5,
	isRelative: 6,
	isEmail: 7,
	isAnchor: 8,
	isFTP: 9,
	isLocalFile: 10
}

/** ***********************************************************************************************
 * My personnal status code
 */
const myErrorCodeURL = {
	excludedDomain: 999,
	noURL: 1000,
	noHttpProcol: 1001,
	nameless: 1002,
	extLinkAccessibility: 1100,
	noAnchor: 1404,
	relative: 1405,
	multipleAnchor: 1409,
	redirectionNotWorking: 3004
}




/** ***********************************************************************************************
 * Method to validate anchor link
 * If an issue then a Diagnostic is added to the 'Problems' tab
 * @param {JSDOM.nodeElem} elem
 * @param {JSDOM} DOM 
 */
function validateAnchor(elem, DOM) {

	const anchorLink = elem.getAttribute('href').replace(/^#/g, '');

	const anchor = DOM.window.document.querySelectorAll("[id='" + anchorLink + "']");
	if (anchor.length == 0) {
		addDiagnostic(new LinkResult(anchorLink, myErrorCodeURL.noAnchor, true), genFunc.getDOMelementPosition(DOM, elem));
	} else if (anchor.length > 1) {
		addDiagnostic(new LinkResult(anchorLink, myErrorCodeURL.multipleAnchor, true), genFunc.getDOMelementPosition(DOM, elem));
	}
}


/** ***********************************************************************************************
 * This method will analyze an A tag passed in parameter and determine what kind of
 * URL it contains.
 * Return the URL Type stored in the enum URLType
 * @param {JSON.nodeElem} domElem Represent an elemnt of the DOM (A tag)
 */
function analyze_URL_Type(domElem) {
	// Check if the link is OK (status 200), else add diagnostics in the "Problems" tab
	const elemURL = domElem.getAttribute('href');

	// Check if the A tag has no URL
	if (elemURL == null || elemURL.trim().length == 0) {
		return URLType.isEmpty;
	}

	// Check if the name of link is empty (ex.: <a href="http://domain.com"></a>)
	if (domElem.innerHTML.trim().length == 0) {
		return URLType.isNameless;
	}

	// Check if the link is an anchor in the same content (start with #)
	if (elemURL.match(/^#/g) != null) {
		return URLType.isAnchor;
	}

	// Check if the URL is an email
	if (elemURL.match(/^\s*mailto\:/gmi) != null) {
		return URLType.isEmail;
	}

	// Check if the URL is an FTP link
	if (elemURL.match(/^\s*ftp\:/gmi) != null) {
		return URLType.isFTP;
	}

	// Check if the URL is a local file link
	if (elemURL.match(/^\s*file\:/gmi) != null) {
		return URLType.isLocalFile;
	}

	// Check if the URL is excluded (from Extension's properties)
	if (vscode.workspace.getConfiguration("html-links-checker").excludedDomains.length > 0) {
		const excludedDomainsList = vscode.workspace.getConfiguration("html-links-checker").excludedDomains;
		if (excludedDomainsList.length > 0) {
			let exclError = false;
			excludedDomainsList.forEach(function (edl) {
				if (elemURL.search(edl) > -1) {
					exclError = true;
				}
			});
			if (exclError) {
				return URLType.isExcluded;
			}
		}
	}

	// Check if the link is relative internal (start with /)
	if (elemURL.match(/^(\/{1})/g) != null) {
		return URLType.isInternal;
	}

	// Check if the link is an anchor in the same content (start with #)
	if (elemURL.match(/(^\.(\.)?\/)|^(?!\w*\:)(\w*\.(html|htm|asp|php|txt)){1}\?*/gi) != null) {
		return URLType.isRelative;
	}

	// If no other Type have been selected then the link is External or
	// internal with protocol and full path 
	return URLType.isExternal;
}


/** ***********************************************************************************************
 * Main Method that retrieve all A tag and check if the URL is alive, redirected or not alive
 * If adresse is an email (mailto:), it's not validate with this method.
 * If the domain of the URl is in the ban list, it's not check too
 */
function mainValidationProcess() {
	// clear all previous diagnostics of the Active Editor
	links_checker_diagColl.delete(vscode.window.activeTextEditor.document.uri);

	// Get text (selection or whole text) in the active editor
	//const curContent = vscode.window.activeTextEditor.document.getText();
	const curContent = genFunc.getTextSelected(true);

	// Create a DOM from the selected text
	let myDOM = new JSDOM(curContent, { includeNodeLocations: true, contentType: "text/html" });

	// Retrieve all A tag in the DOM
	const ATags = myDOM.window.document.querySelectorAll('a');

	// For each A tags
	ATags.forEach(function (elem) {
		// Get the Tag type
		let urlType = analyze_URL_Type(elem);
		switch (urlType) {
			case URLType.isEmpty:			// No URL in the A tag no href, or href is empty
				addDiagnostic(new LinkResult("NO-URL", myErrorCodeURL.noURL, true), genFunc.getDOMelementPosition(myDOM, elem));
				break;
			case URLType.isNameless:	// The link has no name (empty tag: <a href="http://domain.com"></a>)
				addDiagnostic(new LinkResult("Link without name", myErrorCodeURL.nameless, true), genFunc.getDOMelementPosition(myDOM, elem));
				break;
			// URL is part of the excluded domain list
			case URLType.isExcluded:
				addDiagnostic(new LinkResult(elem.href, myErrorCodeURL.excludedDomain, true), genFunc.getDOMelementPosition(myDOM, elem));
				break;
			case URLType.isEmail:
				// Nothing to do for the moment
				break;
			case URLType.isFTP:
				// Nothing to do for the moment
				break;
			case URLType.isLocalFile:		// Protocol is FILE:
				// Nothing to do for the moment
				// TODO: valide if url contains spaces instead of %20 et \ instead of /
				// addDiagnostic(new LinkResult(elem.href, myErrorCodeURL.localfile, true), getDOMelementPosition(myDOM, elem));
				break;
			case URLType.isRelative:		// URL is a relative URL starting with . or .. or having no /
				addDiagnostic(new LinkResult(elem.href, myErrorCodeURL.relative, true), genFunc.getDOMelementPosition(myDOM, elem));
				break;
			// URL is an anchor
			case URLType.isAnchor:
				validateAnchor(elem, myDOM);
				break;
			// URL is an Internal link without domain, it start with /
			case URLType.isInternal:
				let siteDomainName = vscode.workspace.getConfiguration("html-links-checker").domain;
				validateLink(siteDomainName + elem.href, genFunc.getDOMelementPosition(myDOM, elem));
				break;
			// URL is an External link
			case URLType.isExternal:
				validateLink(elem.href, genFunc.getDOMelementPosition(myDOM, elem));
				// Check if accessibility for External link must be processed
				if (vscode.workspace.getConfiguration("html-links-checker").validateExternalLinkAccessibility) {
					validateExternalAccessibility(elem, myDOM);
				}
				break;
		}
	});
}



/** ***********************************************************************************************
 * Method checks if link is working and/or redirected
 * If link is returning something else than status 200 (OK is valid) than a Diagnostic is added to the 'Problems' tab
 * @param {String} link The URL to check
 * @param {vscode.Range} linkRange The position of the link in the Editor
 * @param {String} method The method to use to check URL (head or get)
 * @param {String} initialLink Used only if URL is redirected, this parameters is the initial URL checked
 */
function validateLink(link, linkRange, method = 'head', initialLink = '') {
	// Define needle's option
	const options = {
		//open_timeout: 8000
	};

	// Validate if URL contains protocol (http://)
	if (link.match(/^http(s?)\:\/\//gi) == null) {
		// If the link comes from a redirection, don't display the error
		// because the user don't have the control on this error
		if (initialLink == ''){
			addDiagnostic(new LinkResult(link, myErrorCodeURL.noHttpProcol, true), linkRange);
		}
	}

	// use needle to check the link
	needle(method, link, options, function (err, resp) {
		// If error
		if (err) {
			if (method != 'get') {
				validateLink(link, linkRange, "get", initialLink);
			} else if (method === 'get') {
				if (initialLink != ''){
					addDiagnostic(new LinkResult(link, myErrorCodeURL.redirectionNotWorking, true), linkRange);
				} else {
					addDiagnostic(new LinkResult(link, 404, true), linkRange);
				}
			}
		}
		// If redirection
		else if (Math.trunc(resp.statusCode / 100) == 3) {
			validateLink(resp.headers.location, linkRange, "head", link);
		}
		// If status is different than 200
		else if (resp.statusCode != 200) {
			// Check if the method is different than get to not loop forever
			if (method != 'get') {
				// Check the link again but with the "get" method instead of "head"
				validateLink(link, linkRange, "get", initialLink);
			} else if (method === 'get') {
				addDiagnostic(new LinkResult(link, resp.statusCode, true), linkRange);
			}
		}
		// If status is different than 200 and redirection have been processed
		else if (resp.statusCode != 200 && initialLink != '') {
				addDiagnostic(new LinkResult(link, myErrorCodeURL.redirectionNotWorking, true), linkRange);
		}
		// If the link is OK (status 200) but have been redirected
		else if (resp.statusCode == 200 && initialLink != '') {
			addDiagnostic(new LinkResult(initialLink, resp.statusCode, true, true, link), linkRange);
		}
	});
}



/** ***********************************************************************************************
 * Method to define a diagnostic (including message) and display it in the 'Problems' tab
 * @param {LinkResult} linkresult Contains LinkResult in error with required information
 * @param {vscode.Range} linkRange The range in the Editor to put 'Problem' underscore
 */
function addDiagnostic(linkresult, linkRange) {
	let theDiag;	// Create the object linkDiagnostic

	// If link is redirected but is working = send a warning to update the link
	if (linkresult.redirected && linkresult.statusCode == 200) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link redirected to: "' + linkresult.redirectionLink, linkRange, vscode.DiagnosticSeverity.Warning);
	}
	// If the link has been redirected but the redirection was not working
	else if (linkresult.statusCode == myErrorCodeURL.redirectionNotWorking) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link has been redirected but the new URL has not answered. Manual validation is required.', linkRange, vscode.DiagnosticSeverity.Error);
	}
	// If the status code is an issue with the authentication = send an error message
	else if (linkresult.statusCode == 401 || linkresult.statusCode == 403 || linkresult.statusCode == 407) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link error: Authentication required. Validation must be done manually.', linkRange, vscode.DiagnosticSeverity.Error);
	}
	// If the status code is an empty A tag (no URL)
	else if (linkresult.statusCode == myErrorCodeURL.nameless) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'"A" tag is empty (no name/text). It must be removed or a name/text must be added.', linkRange, vscode.DiagnosticSeverity.Error);
	}
	// If the status code is an empty A tag (no URL)
	else if (linkresult.statusCode == myErrorCodeURL.noURL) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'"A" tag has no URL.', linkRange, vscode.DiagnosticSeverity.Error);
	}
	// If the status code is an anchor inexistant
	else if (linkresult.statusCode == myErrorCodeURL.noHttpProcol) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Protocol (http://) is missing in the URL. It should be added.', linkRange, vscode.DiagnosticSeverity.Warning);
	}
	// If the status code is an anchor inexistant
	else if (linkresult.statusCode == myErrorCodeURL.noAnchor) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link error: Anchor is not existing in the code.', linkRange, vscode.DiagnosticSeverity.Error);
	}
	// If the status code is related to a multiples anchor
	else if (linkresult.statusCode == myErrorCodeURL.multipleAnchor) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link error: More than one anchor (ID) exist in the code. Only one ID must be presents.', linkRange, vscode.DiagnosticSeverity.Error);
	}
	// If the status code is relative from the folder not the root
	else if (linkresult.statusCode == myErrorCodeURL.extLinkAccessibility) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link is not accessible.', linkRange, vscode.DiagnosticSeverity.Warning);
	}
	// If the status code is relative from the folder not the root
	else if (linkresult.statusCode == myErrorCodeURL.relative) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link is relative from folder instead of root site OR link is mistyped. Validation impossible for the moment, it must be validate manually.', linkRange, vscode.DiagnosticSeverity.Warning);
	}
	// If the link is part of the Excluded domain then only add a message to user, only to be sure.
	else if (linkresult.statusCode == myErrorCodeURL.excludedDomain) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link is a member of the excluded domains list.', linkRange, vscode.DiagnosticSeverity.Information);
	}
	// send an error for all other kind of error
	else {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link error: Link is not working. It must be updated or removed.', linkRange, vscode.DiagnosticSeverity.Error);
	}

	// Add the error in the array of diagnostics and display it in the 'Problems' tab
	let myDiagnostics = Array.from(links_checker_diagColl.get(vscode.window.activeTextEditor.document.uri));
	myDiagnostics.push(theDiag);
	links_checker_diagColl.set(vscode.window.activeTextEditor.document.uri, myDiagnostics);
}


/** ***********************************************************************************************
 * Method checks if this external link is compliant with accessibility
 * Check for the attribute 'rel="external"' and if link text contain (external link)
 * @param {JSDOM.nodeElem} DOMelem
 * @param {JSDOM} DOM 
 */
function validateExternalAccessibility(elem, myDOM) {
	// check if link could be internal link (domain)
	let localDomain = vscode.workspace.getConfiguration("html-links-checker").domain;
	localDomain = localDomain.replace(/^(\w*\:\/\/)?(www\.)?(.+)/gmi, "$3");
	if (elem.href.search(localDomain) > -1) {
		// The URL contains the local domain. So exit without any action.
		return;
	}

	let relIsMissing = false
	const externalAttribute = elem.getAttribute('rel');
	if (externalAttribute == null || externalAttribute != "external") {
		relIsMissing = true;
	}

	let externalTextIsMissing = true;
	if (vscode.workspace.getConfiguration("html-links-checker").externalLinkText.length > 0) {
		const externalTexts = vscode.workspace.getConfiguration("html-links-checker").externalLinkText;
		for (let x = 0; x < externalTexts.length; x++) {
			const regpattern = new RegExp(externalTexts[x], "gi");
			if (elem.innerHTML.match(regpattern) != null) {
				externalTextIsMissing = false;
				break;
			}
		}
	}

	if (relIsMissing || externalTextIsMissing) {
		addDiagnostic(new LinkResult(elem.href, myErrorCodeURL.extLinkAccessibility, true), genFunc.getDOMelementPosition(myDOM, elem));
	}
}
