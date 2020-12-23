const vscode = require('vscode');
const genFunc = require('../lib/genericFunctions');
const needle = require('needle');
const JSDOM = require('jsdom').JSDOM


// Create a new Collection for Diagnostics
// A Diagnostics Collection must be outsides of an function.
const links_checker_diagColl = vscode.languages.createDiagnosticCollection("html-link-checker");

// Use to clear the "Problems" Tab when we close the file
// TODO: Not working properly - Will clear all error when we close one file...
vscode.workspace.onDidCloseTextDocument(function (listener) {
	// clear all previous diagnostics
	//links_checker_diagColl.clear();
	links_checker_diagColl.delete(listener.uri);
	//links_checker_diagColl.set(vscode.window.activeTextEditor.document.uri, undefined);
	links_checker_diagColl.set(listener.uri, undefined );
});


/** ***********************************************************************************************
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let disposable = vscode.commands.registerCommand('html-links-checker.a_tag', function () {
		links_checker_diagColl.set(vscode.window.activeTextEditor.document.uri, []);
		// Check all A tags
		checkAlltags_A();

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
 * @property {String} link The URL to analyze
 * @property {Number} statusCode The status code returned by the server
 * @property {Boolean} hasError This link has error
 * @property {String} errorMsg The error message to display in the 'Problems' tab
 * @property {vscode.DiagnosticSeverity} errorLevel The type of diagnostic error
 * @property {Boolean} redirected This link is redirected (default: False)
 * @property {String} redirectionLink The new URL if redirected
 */
class LinkResult {
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
	constructor(code, message, range, severity) {
		this.code = code || 0,
			this.message = message || '',
			this.range = range || undefined,
			this.severity = severity || vscode.DiagnosticSeverity.Error,
			this.source = "HTML Links Checker"
	}
}

/** ***********************************************************************************************
 * My personnel Types of URL
 */
const URLType = {
	isEmpty: null,
	isExcluded: -1,
	isExternal: 1,
	isInternal: 2,
	isRelative: 3,
	isEmail: 4,
	isAnchor: 5,
	isFTP: 6,
	isLocalFile: 7
}

/** ***********************************************************************************************
 * My personnal status code
 */
const myErrorCodeURL = {
	noURL: 1000,
	noAnchor: 1404,
	multipleAnchor: 1409,
	relative: 1405
}


/** ***********************************************************************************************
 * @param {JSDOM} DOM 
 * @param {JSDOM.nodeElem} DOMelem Element of DOM to get the range position in Editor
 */
function getDOMelementPosition(DOM, DOMelem) {
	// Get the node location

	const nodeElem = DOM.nodeLocation(DOMelem);

	// Set the range of text the header in error
	const elemRange = new vscode.Range(
		nodeElem.startTag.startLine - 1,
		nodeElem.startTag.startCol - 1,
		nodeElem.startTag.endLine - 1,
		nodeElem.startTag.endCol - 1);

	return elemRange;
}


/** ***********************************************************************************************
 * Method to validate anchor link
 * If an issue then a Diagnostic is added to the 'Problems' tab
 * @param {String} anchorLink 
 * @param {JSDOM} DOM 
 */
function checkAnchorError(elem, DOM) {

	const anchorLink = elem.getAttribute('href').replace(/^#/g, '');

	const anchor = DOM.window.document.querySelectorAll("[id='" + anchorLink + "']");
	if (anchor.length == 0) {
		addDiagnostic(new LinkResult(anchorLink, myErrorCodeURL.noAnchor, true), getDOMelementPosition(DOM, elem));
	} else if (anchor.length > 1) {
		addDiagnostic(new LinkResult(anchorLink, myErrorCodeURL.multipleAnchor, true), getDOMelementPosition(DOM, elem));
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
				let regexttstr = "/" + edl + "/";
				regexttstr.replace(".", "\\.");
				const regexttPatern = new RegExp(regexttstr, "gi");
				if (elemURL.match(regexttPatern) > 0) {
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
	if (elemURL.match(/(^\.\.\/)|^(?!\w*\:)(\w*\.\w*$){1}/gi) != null) {
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
function checkAlltags_A() {
	// clear all previous diagnostics
	//links_checker_diagColl.clear();
	links_checker_diagColl.delete(vscode.window.activeTextEditor.document.uri);

	// Get the selected text/All text in the active Editor
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
				addDiagnostic(new LinkResult("NO-URL", myErrorCodeURL.noURL, true), getDOMelementPosition(myDOM, elem));
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
				//hasError = checkLocalFileError(elem.href);
				break;
			case URLType.isRelative:		// URL is a relative URL starting with .. or having no /
				addDiagnostic(new LinkResult(elem.href, myErrorCodeURL.relative, true), getDOMelementPosition(myDOM, elem));
				break;
			// URL is an anchor
			case URLType.isAnchor:
				checkAnchorError(elem, myDOM);
				break;
			// URL is an Internal link without domain, it start with /
			case URLType.isInternal:
				let siteDomainName = vscode.workspace.getConfiguration("html-links-checker").domain;
				checkLinkError(siteDomainName + elem.href, getDOMelementPosition(myDOM, elem));
				break;
			// URL is an External link
			case URLType.isExternal:
				checkLinkError(elem.href, getDOMelementPosition(myDOM, elem));
				break;
			// URL is part of the excluded domain list
			case URLType.isExcluded:
				// nothing to do
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
function checkLinkError(link, linkRange, method = 'head', initialLink = '') {
	const options = {
		// If needle option are required, put here
	};

	// use needle to check the link
	needle(method, link, options, function (err, resp) {
		// If error
		if (err) {
			if (method != 'get') {
				checkLinkError(link, linkRange, "get", initialLink);
			} else if (method === 'get') {
				//console.log("ERREUR: " + method + " | " + link + " | " + initialLInk);
				addDiagnostic(new LinkResult(link, 404, true), linkRange);
			}
		}
		// If redirection
		else if (Math.trunc(resp.statusCode / 100) == 3) {
			// Check if the redirection link is working
			checkLinkError(resp.headers.location, linkRange, "head", link);
		}
		// If status is different than 200
		else if (resp.statusCode != 200) {
			// Check if the method is different than get to not loop forever
			if (method != 'get') {
				// Check the link again but with the "get" method instead of "head"
				checkLinkError(link, linkRange, "get", initialLink);
			} else if (method === 'get') {
				//console.log(method + " | " + link + " | " + resp.statusCode + " | " + initialLInk);
				addDiagnostic(new LinkResult(link, resp.statusCode, true), linkRange);
			}
		}
		// If the link is OK (status 200) but have been redirected
		else if (resp.statusCode == 200 && initialLink != '') {
			//console.log(method + " | " + link + " | " + resp.statusCode + " | " + initialLInk);
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
			'Link redirected to: "' + linkresult.redirectionLink, linkRange,
			vscode.DiagnosticSeverity.Warning);
	}
	// If the status code is an issue with the authentication = send an error message
	else if (linkresult.statusCode == 401 || linkresult.statusCode == 403 || linkresult.statusCode == 407) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link error: Authentication required. Validation must be done manually.', linkRange, vscode.DiagnosticSeverity.Error);
	}
	// If the status code is an empty A tag (no URL)
	else if (linkresult.statusCode == myErrorCodeURL.noURL) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link error: Anchor is not existing in the code.', linkRange, vscode.DiagnosticSeverity.Error);
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
	else if (linkresult.statusCode == myErrorCodeURL.relative) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link is relative from folder instead of root site OR link is mistyped. Validation impossible, it must be validate manually.', linkRange, vscode.DiagnosticSeverity.Warning);
	}
	// send an error for all other kind of error
	else {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link error: Must be updated or removed.', linkRange, vscode.DiagnosticSeverity.Error);
	}

	// Add the error in the array of diagnostics and display it in the 'Problems' tab
	let myDiagnostics = Array.from(links_checker_diagColl.get(vscode.window.activeTextEditor.document.uri));
	myDiagnostics.push(theDiag);
	links_checker_diagColl.set(vscode.window.activeTextEditor.document.uri, myDiagnostics);
}

