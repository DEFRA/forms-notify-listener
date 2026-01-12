# Notify

## Overview

The Gov UK Notify service sends out both internal and external e-mails for forms submissions. It has limited formatting capabilities which are based on Markdown. It's important that any content sent to the service which contains Markdown formatting characters is escaped, otherwise it will be rendered as formatted HTML, instead of the original text.

## Escaping

Escaping certain content sent to Notify is required to avoid several issues, such as:

- `-` being rendered as an en dash when surrounded by spaces or tabs.
- `-` at the beginning of a line being rendered as a bullet point.
- `.` and `,` having any leading spaces removed. Eg `abc . def` becomes `abc. def`.

### Escaping with Triple Backticks

Text can be escaped using triple backticks. This will prevent any Markdown formatting from being applied to the content. However, it does not preserve line breaks and it will not add line breaks when multiple lines each separately escaped by backticks follow each other. In that scenario, the lines will be joined together, making this unsuitable for multi-line content.

### Previous Markdown Escape Function

A previous Markdown escape function used a naive approach to escape Markdown formatting characters. It escaped all characters from a special list with a backslash. This caused issues whereby content that did not need to be escaped rendered the backslash as a literal character. Eg `2 * 2` becomes `2 \* 2`.

### New Markdown Escape Function

A more advanced escape function was required and has been developed with the following rules:

- A `-` or `*` or `#` character at the start of a line is escaped with a backslash.
- Tab characters are replaced with 4 HTML encoded spaces (`&nbsp;`).
- A `-` character surrounded by spaces or tabs is has those spaces or tabs replaced with HTML encoded spaces (`&nbsp;`).
- ` ``` ` being the only content on a single line is replaced with `` ` ` ` ``
- Where a period `.` or comma `,` has a leading space or tab character, then the space is converted to a HTML non-breaking space (`&nbsp;`) and the tab character is converted to 4 HTML encoded spaces.
- Where a Markdown link is present (`[text](url)`), then this is broken up by inserting a space between the square brackets and the round brackets (eg `[text](url)` becomes `[text] (url)`).

### E-mail Body Content to Test Escaping

The following content will show the results of the escape function on content sent to Notify should the content be sent to Notify both with and without escaping.

```javascript
const bodyContent = `
# Punctuation escape test cases

## Link
[ABC - DEF](https://www.google.com/abc-def)
[ABC - DEF] (https://www.google.com/abc-def)
&lsqb;ABC - DEF&rsqb;&lpar;https://www.google.com/abc-def&rpar;

## Not Link
&lsqb;ABC - DEF&rsqb;&lpar;https://www.google.com/abc-def
ABC - DEF](https://www.google.com/abc-def)

## Backtick (\`)
\` abc \` def abc\` def abc \`def abc\`def abc	\`	def
\`\`\`
Line 1
Line 2
  \`\`\`

## Single quote (')
' abc ' def abc' def abc 'def abc'def abc	'	def

## Asterisk (*)
* abc * def abc* def abc *def abc*def abc	*	def

## Underscore (_)
_ abc _ def abc_ def abc _def abc_def abc	_	def

## Open brace ({)
{ abc { def abc{ def abc {def abc{def abc	{	def

## Close brace (})
} abc } def abc} def abc }def abc}def abc	}	def

## Open bracket ([)
[ abc [ def abc[ def abc [def abc[def abc	[	def

## Close bracket (])
] abc ] def abc] def abc ]def abc]def abc	]	def

## Open paren (()
( abc ( def abc( def abc (def abc(def abc	(	def

## Close paren ())
) abc ) def abc) def abc )def abc)def abc	)	def

## Hash (#)
# abc # def abc# def abc #def abc#def abc	#	def

## Plus (+)
+ abc + def abc+ def abc +def abc+def abc	+	def

## Minus/Hyphen (-)
- abc - def abc- def abc -def abc-def abc	-	def

## Period (.)
. abc . def abc. def abc .def abc.def abc	.	def

## Comma
, abc , def abc, def abc ,def abc,def abc	,	def

## Exclamation (!)
! abc ! def abc! def abc !def abc!def abc	!	def
`
```
