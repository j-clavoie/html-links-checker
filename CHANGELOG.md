# Change Log

## [1.1.2] - 2021-##########################

## [1.1.1] - 2021-01-26
+ Updated dependencies


## [1.1.0] - 2021-01-25
**First attempt with this new rebuilt code.**<br>
Working version to test/evaluate in production to find improvement before to continue code conversion.
+ Rebuilt the code with object perspective
+ Multiple Error/Warning messages in 'Problems' tab are merged together to avoid duplication of message for the same link. Only one message with all errors/warnings in it.
+ Warning added for relative URL, because this kind of link is not validate for the moment (need manual validation)
+ Email validation (format) has been added with error message if the address is not a valide email format.
+ Validation of spaces in URL, error added when spaces is present in URL because it's not supposed to have space in URL, %20 must be replace spaces.

## [1.0.8] - 2021-01-12
+ Test to fix working link but displayed as error.<br>
  It's temporary. The code is reviewed and big change will come.

## [1.0.7] - 2021-01-08
+ Remove validation of space in local file (FILE:)
+ changes some useless part of code

## [1.0.6] - 2021-01-08
+ Trying to fix a bug on Windows that don't have on Linux

## [1.0.5] - 2021-01-08
+ Little bug fixed and adding a temporary variable watcher 

## [1.0.4] - 2021-01-07
+ Extension's property name fixed in code.

## [1.0.3] - 2021-01-06
+ Change node module for URL request from "needle" to "urllib".<br />More powerfull and quicker for my needs
+ Added Extensions's properties to have a better way to display link warning/error
  + Protocol: This setting is related to redirection caused only by changing the protocl. Example: from ```http``` to ```https```<br />allows to force warning in any case, only display if it's the only error, or no display warning.
  + WWW: This setting is related to redirection caused only by adding ```www``` at the domain name.<br />allows to force warning in any case, only display if it's the only error, or no display warning.
  + Request method: Allow to set the prefered method to use to send request: "head", "get" or "post"
+ Only use the prefered request method instead of re-request URL with "get" when not working with "head". Maybe will re-add this feature later. Future will say.



## [1.0.2] - 2021-01-04
+ Allow validation in a part of the code (selected text).
  If no text selected the whole content is selected.
+ Minors fixes and improvement in the code
+ Add a Information in the 'Problems' tab when link is part of the excluded domains list.


## [1.0.1] - 2020-12-23
Fixed issue with relative links.
The bug was with URL without protocol (http://) and short domain (ex.: "domain.com"). It was considered as a relative URL instead of URL without protocol.
The regex realted to "relative" link has been updated to include file type (html, htm, asp, php, txt).

Added validation of A tag without text (ex.: <a href="domain.name"></a>).
An error is generated if it's occur.


## [1.0.0] - 2020-12-23
Initial version of extension is able to validate:
+ anchor
+ internal link relative from root: start with dash (/) not with ../
+ external link

Returns an error for:
+ link that requires authentication
+ link relative from current root ('../folder/file.html' or 'file.html')
+ link not working (no domain name or status 404)
+ link redirected (provide new URL)
+ Empty A tag (no href or href is empty)
+ (optional) Accessibility for External link.

No validate:
+ email address
+ FTP link
+ local file link (FILE://)

## previous [1.0.0]
- Was for development and testing. No longer version before 1.0.0 should be used.
