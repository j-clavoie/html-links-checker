# Change Log

## [1.0.2] - 
+ Allow validation in a part of the code (selected text).
  If no text selected the whole content is selected.
+ Minors fixes and improvement in the code


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
