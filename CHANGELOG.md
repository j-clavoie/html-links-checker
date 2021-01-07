# Change Log


## [1.0.3] - 2021-01-06
+ Change node module for URL request from "needle" to "urllib".<br />More powerfull and quicker for my needs
+ Added Extensions's properties to have a better way to display link warning/error
  + Protocol: This setting is related to redirection caused only by changing the protocl. Example: from ```http``` to ```https```<br />allows to force warning in any case, only display if it's the only error, or no display warning.
  + WWW: This setting is realted to redirection caused only by adding ```www``` at the domain name.<br />allows to force warning in any case, only display if it's the only error, or no display warning.
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
