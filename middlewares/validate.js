// Zod-based request body validator. Replaces ad-hoc `if (!req.body.x)` checks
// scattered across controllers. On success, req.body is replaced with the
// parsed (and stripped-of-unknown-keys) result so controllers see only the
// fields the schema defined.
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
        const fieldErrors = {}
        for (const issue of result.error.issues) {
            const key = issue.path.join('.') || '_'
            if (!fieldErrors[key]) fieldErrors[key] = issue.message
        }
        return res.status(400).json({
            error: 'Invalid input',
            fields: fieldErrors
        })
    }
    req.body = result.data
    next()
}

module.exports = { validate }
