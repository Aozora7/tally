module.exports = {
    'limit-jsx-render-length': {
        meta: {
            type: "suggestion",
            docs: {
            description: "Limit the number of lines in JSX return statements",
            },
            schema: [
            {
                type: "object",
                properties: {
                max: { type: "number", default: 50 },
                },
                additionalProperties: false,
            },
            ],
            messages: {
            tooLong:
                "JSX return is {{lines}} lines long. Maximum allowed is {{max}} lines.",
            },
        },

        create(context) {
            const max = context.options[0]?.max ?? 50;

            function isJSX(node) {
            return (
                node &&
                (node.type === "JSXElement" ||
                node.type === "JSXFragment")
            );
            }

            function checkReturn(node) {
            // node is a ReturnStatement
            const arg = node.argument;
            if (!isJSX(arg)) return;

            const start = arg.loc.start.line;
            const end = arg.loc.end.line;
            const lines = end - start + 1;

            if (lines > max) {
                context.report({
                node: arg,
                messageId: "tooLong",
                data: { lines, max },
                });
            }
            }

            return {
                ReturnStatement(node) {
                    // Only care about returns inside function components
                    // Walk up to find the enclosing function
                    let parent = node.parent;
                    while (parent) {
                    if (
                        parent.type === "FunctionDeclaration" ||
                        parent.type === "FunctionExpression" ||
                        parent.type === "ArrowFunctionExpression"
                    ) {
                        // Check it looks like a component (PascalCase name or returns JSX)
                        checkReturn(node);
                        break;
                    }
                    parent = parent.parent;
                    }
                },
            };
        },
    }
};