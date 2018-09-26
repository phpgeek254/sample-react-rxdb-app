export const schema = {
    title: 'Chat schema',
    description: 'Database schema for the chat application',
    version: 0,
    type: 'object',
    properties: {
        id: {
            type: 'string',
            primary: true
        },
        message: {
            type: 'string'
        }
    },
    required: ['message']
}