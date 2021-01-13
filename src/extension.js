const vscode = require('vscode');
const genFunc = require('./genericFunctions');
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
		main_Validation_Process();
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
	spaceInLocalFile: 1100,
	backSlashInLocalFile: 1101,
	extLinkAccessibility: 1100,
	noAnchor: 1404,
	multipleAnchor: 1405,
	relative: 1410,
	redirected: 3000,
	redirectionNotWorking: 3004,
	redirectProtocol: 3100,
	redirectWWW: 3110,
	networkError: 8000,
	connectionTimeout: 8010
}




/** ***********************************************************************************************
 * Method to validate anchor link
 * If an issue then a Diagnostic is added to the 'Problems' tab
 * @param {JSDOM.nodeElem} elem
 * @param {JSDOM} DOM 
 */
function validate_Anchor(elem, DOM) {

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
	let urlTypeReturn = [];

	// Check if the link is OK (status 200), else add diagnostics in the "Problems" tab
	const elemURL = domElem.getAttribute('href');

	// Check if the A tag has no URL
	if (elemURL == null || elemURL.trim().length == 0) {
		urlTypeReturn.push(URLType.isEmpty);
	}

	// Check if the name of link is empty (ex.: <a href="http://domain.com"></a>)
	if (domElem.innerHTML.trim().length == 0) {
		urlTypeReturn.push(URLType.isNameless);
	}

	// Check if the link is an anchor in the same content (start with #)
	if (elemURL.match(/^#/g) != null) {
		urlTypeReturn.push(URLType.isAnchor);
	}

	// Check if the URL is an email
	if (elemURL.match(/^\s*mailto\:/gmi) != null) {
		urlTypeReturn.push(URLType.isEmail);
	}

	// Check if the URL is an FTP link
	if (elemURL.match(/^\s*ftp\:/gmi) != null) {
		urlTypeReturn.push(URLType.isFTP);
	}

	// Check if the URL is a local file link (file://)
	if (elemURL.match(/^\s*file\:/gmi) != null) {
		urlTypeReturn.push(URLType.isLocalFile);
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
				urlTypeReturn.push(URLType.isExcluded);
			}
		}
	}

	// Check if the link is relative internal (start with /)
	if (elemURL.match(/^(\/{1})/g) != null) {
		urlTypeReturn.push(URLType.isInternal);
	}

	// Check if the link is relative from the current folder
	//(start with .. or nothing and ends with web file extension: html, htm, asp, php, txt)
	if (elemURL.match(/(^\.(\.)?\/)|^(?!\w*\:)(\w*\.(html|htm|asp|php|txt)){1}\?*/gi) != null) {
		urlTypeReturn.push(URLType.isRelative);
	}

	// If no other Type have been selected then the link is External or
	// internal with protocol and full path 
	// TODO: Trouver un moyen pour isoler les liens externes
	if (urlTypeReturn.length == 0){
		urlTypeReturn.push(URLType.isExternal);
	}

	return urlTypeReturn;
}


/** ***********************************************************************************************
 * Main Method that retrieve all A tag and check if the URL is alive, redirected or not alive
 * If adresse is an email (mailto:), it's not validate with this method.
 * If the domain of the URl is in the ban list, it's not check too
 */
function main_Validation_Process() {
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
		// Get the position (Range) of the element in the DOM
		const elemRange = genFunc.getDOMelementPosition(myDOM, elem);

		// Get the URL type
		const getAllTypesURL = analyze_URL_Type(elem);
		
		// Process each URL Type
		if (getAllTypesURL.length > 0) {

			getAllTypesURL.forEach(function (curType) {
				switch (curType) {
					case URLType.isEmpty:			// No URL in the A tag no href, or href is empty
						addDiagnostic(new LinkResult("NO-URL", myErrorCodeURL.noURL, true), elemRange);
						break;
					case URLType.isNameless:	// The link has no name (empty tag: <a href="http://domain.com"></a>)
						addDiagnostic(new LinkResult("Link without name", myErrorCodeURL.nameless, true), elemRange);
						break;
					// URL is part of the excluded domain list
					case URLType.isExcluded:
						addDiagnostic(new LinkResult(elem.href, myErrorCodeURL.excludedDomain, true), elemRange);
						break;
					case URLType.isEmail:
						// Nothing to do for the moment
						break;
					case URLType.isFTP:
						// Nothing to do for the moment
						break;
					case URLType.isLocalFile:
						// Protocol is FILE:
						// Not sure to validate 
						validate_Local_File_Link(elem.href, elemRange);
						break;
					case URLType.isRelative:		// URL is a relative URL starting with . or .. or having no /
						addDiagnostic(new LinkResult(elem.href, myErrorCodeURL.relative, true), elemRange);
						break;
					// URL is an anchor
					case URLType.isAnchor:
						validate_Anchor(elem, myDOM);
						break;
					// URL is an Internal link without domain, it start with /
					case URLType.isInternal:
						let siteDomainName = vscode.workspace.getConfiguration("html-links-checker").localDomain;
						validate_External_Link(siteDomainName + elem.href, elemRange);
						break;
					// URL is an External link
					case URLType.isExternal:
						validate_External_Link(elem.href, elemRange);
						// Check if accessibility for External link must be processed
						if (vscode.workspace.getConfiguration("html-links-checker").validateExternalLinkAccessibility) {
							validate_External_Accessibility(elem, myDOM);
						}
						break;
				}
			});
		}
	});
}



/** ***********************************************************************************************
 * Method checks if link is working and/or redirected
 * If link is returning something else than status 200 (OK is valid) than a Diagnostic is added to the 'Problems' tab
 * @param {String} link The URL to check
 * @param {vscode.Range} linkRange The position of the link in the Editor
 * @param {String} initialLink Used only if URL is redirected, this parameters is the initial URL checked
 */
function validate_External_Link(link, linkRange, initialLink = '') {
	// Define needle's option
	const options = {
		method: vscode.workspace.getConfiguration("html-links-checker").requestMethod,
		rejectUnauthorized: false,
		followRedirect: true
	};

	// Validate if URL contains protocol (http://)
	if (link.match(/^http(s?)\:\/\//gi) == null) {
		// If the link comes from a redirection, don't display the error
		// because the user don't have the control on this error
		if (initialLink == '') {
			addDiagnostic(new LinkResult(link, myErrorCodeURL.noHttpProcol, true), linkRange);
		}
	}

	// Request the URL
	urllib.request(link, options, function (err, data, resp) {
		// If error
		if (err || resp.statusCode != 200) {
			let cerr;
			switch (resp.statusCode) {
				case -1:
					cerr = myErrorCodeURL.networkError;
					break;
				case -2:
					cerr = myErrorCodeURL.connectionTimeout;
					break;
				default:
					cerr = resp.statusCode;
					break;
			}
			// Add the diagnostic in the 'Problems' tab
			addDiagnostic(new LinkResult(link, cerr, true), linkRange);
		} else {
			// If URL have been redirected then analyze differences
			if (resp.requestUrls.length > 1) {
				// Get Extension's properties related to Protocol redirection warning
				const paramProtocl = vscode.workspace.getConfiguration("html-links-checker").showProtocolRedirectionWarning.toLowerCase();
				// Get Extension's properties related to WWW redirection warning
				const paramWWW = vscode.workspace.getConfiguration("html-links-checker").showWwwRedirectionWarning.toLowerCase();

				// Get initial and final URL without the last / (if present)
				let initialURL = resp.requestUrls[0].replace(/\/$/g, '');
				let finalURL = resp.requestUrls[resp.requestUrls.length - 1].replace(/\/$/g, '');

				// Apply regex on initial and final URL for following comparaisons
				initialURL = initialURL.match(/(.*?\:\/\/)(www\.)*(.+?)$/i);
				finalURL = finalURL.match(/(.*?\:\/\/)(www\.)*(.+?)$/i);

				// Check if the domains (excluding www) are differents
				const isDomainChanged = initialURL[3] == finalURL[3] ? false : true;

				// Compare the initial's protocol vs final's protocol
				// Usualy secure is added http -> httpS
				let isProtocolChanged = initialURL[1] == finalURL[1] ? false : true;

				// Check if WWW has been added or removed from the initial to final URL
				let isWWWChanged = initialURL[2] == finalURL[2] ? false : true;


				if (isDomainChanged) {
					// Add the diagnostic in the 'Problems' tab
					addDiagnostic(new LinkResult(initialURL[0], resp.statusCode, true, true, finalURL[0]), linkRange);
				}


				// If this error must not be displayed
				if (paramProtocl == 'No'.toLowerCase()) {
					isProtocolChanged = false;
				}
				// If protocol has been changed and must be displayed separate OR
				// if protocol has been changed, no DomainChange applied and must be displayed only alone
				if ((isProtocolChanged && paramProtocl == 'yes - separate'.toLowerCase()) ||
					(isProtocolChanged && isDomainChanged == false && paramProtocl == 'Yes - global'.toLowerCase())) {
					// Add the diagnostic in the 'Problems' tab
					addDiagnostic(new LinkResult(initialURL[0], myErrorCodeURL.redirectProtocol, true, true, finalURL[0]), linkRange);
				}


				// If this error must not be displayed
				if (paramWWW == 'No'.toLowerCase()) {
					isWWWChanged = false;
				}
				// If WWW has been changed and must be displayed separate OR
				// if WWW has been changed, no DomainChange applied and must be displayed only alone
				if ((isWWWChanged && paramWWW == 'yes - separate'.toLowerCase()) ||
					(isWWWChanged && isDomainChanged == false && paramWWW == 'Yes - global'.toLowerCase())) {
					// Add the diagnostic in the 'Problems' tab
					addDiagnostic(new LinkResult(initialURL[0], myErrorCodeURL.redirectWWW, true, true, finalURL[0]), linkRange);
				}
			}
		}
	});
}

/**
 * Method checks if the local file URL contains backslash (\) or spaces 
 * @param {String} link The URL to check
 * @param {vscode.Range} linkRange The position of the link in the Editor
 */
function validate_Local_File_Link(link, linkRange) {
	const checkSpaces = link.match(/\s/gi);
	if (checkSpaces == undefined || checkSpaces == null) {
		//		addDiagnostic(new LinkResult(link, myErrorCodeURL.spaceInLocalFile, true), linkRange);
	}
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
	
	// If link is redirected and that work but only protocol has been changed
	else if (linkresult.redirected && linkresult.statusCode == myErrorCodeURL.redirectProtocol) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link redirected protocol (HTTP) has been changed, redirected to: "' + linkresult.redirectionLink, linkRange, vscode.DiagnosticSeverity.Warning);
	}
	// If link is redirected and that work but only WWW has been changed
	else if (linkresult.redirected && linkresult.statusCode == myErrorCodeURL.redirectWWW) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link redirected WWW has been changed, redirected to: "' + linkresult.redirectionLink, linkRange, vscode.DiagnosticSeverity.Warning);
	}
	// If the link has been redirected but the redirection was not working
	else if (linkresult.statusCode == myErrorCodeURL.redirectionNotWorking) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link has been redirected but the new URL has not answered. Manual validation is required.', linkRange, vscode.DiagnosticSeverity.Error);
	}
	// If local file contains spaces
	else if (linkresult.statusCode == myErrorCodeURL.spaceInLocalFile) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link contains space(s) and should be replaced by "%20". URL shouldn\'t have spaces.', linkRange, vscode.DiagnosticSeverity.Warning);
	}
	// If the status code is an issue with the authentication = send an error message
	else if (linkresult.statusCode == 401 || linkresult.statusCode == 403 || linkresult.statusCode == 407) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link error: Authentication required. Validation must be done manually. (' + linkresult.link + ')', linkRange, vscode.DiagnosticSeverity.Error);
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
	// If the status code is no protocol
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
	else if (linkresult.statusCode != 200) {
		theDiag = new linkDiagnostic(linkresult.statusCode,
			'Link error: Link is not working. It must be updated or removed.' + linkresult.link + ')', linkRange, vscode.DiagnosticSeverity.Error);
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
function validate_External_Accessibility(elem, myDOM) {
	// check if link could be internal link (domain)
	let localDomain = vscode.workspace.getConfiguration("html-links-checker").localDomain;
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
