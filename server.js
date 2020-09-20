const express = require('express');
const expressGraphQL = require('express-graphql');
const {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLInt,
    GraphQLNonNull,
    GraphQLList,
} = require('graphql');
const app = express();

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ levels: [], users: [] }).write();

const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: { type: GraphQLNonNull(GraphQLInt) },
        name: { type: GraphQLNonNull(GraphQLString) },
        levels: {
            type: GraphQLList(LevelType),
            resolve: (author) => {
                return db.get('levels').filter({authorId: author.id}).value();
            }
        }
    }),
});

const LevelType = new GraphQLObjectType({
    name: 'Level',
    fields: () => ({
        id: {type: GraphQLNonNull(GraphQLInt)},
        name: {type: GraphQLNonNull(GraphQLString)},
        authorIds: {type: GraphQLNonNull(GraphQLList(GraphQLInt))},
        baseLevel: {type: GraphQLNonNull(GraphQLInt)},

        author: {
            type: GraphQLString,
            resolve: (level) => {
                return db.get('users').filter((user) => level.authorIds.includes(user.id)).value()
                    .map((user) => user.name).join(', ');
            }
        },
        authors: {
            type: GraphQLList(UserType),
            resolve: (level) => {
                return db.get('users').filter((user) => level.authorIds.includes(user.id)).value();
            }
        },
    }),
});

const RootQueryType = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
        levels: {
            type: GraphQLList(LevelType),
            args: {
              filter: { type: GraphQLString },
            },
            resolve: (parent, args) => args.filter
                ? db.get('levels').filter((level) => level.name.toLowerCase().includes(args.filter.toLowerCase())).value()
                : db.get('levels').value(),
        },
        users: {
            type: GraphQLList(UserType),
            args: {
                filter: { type: GraphQLString },
            },
            resolve: () => db.get('users').value(),
        },
        level: {
            type: LevelType,
            args: {
              id: { type: GraphQLInt, }
            },
            resolve: (parent, args) => db.get('levels').find({ id: args.id }).value(),
        },
        user: {
            type: UserType,
            args: {
                id: { type: GraphQLInt, }
            },
            resolve: () => db.get('users').find({ id: args.id }).value(),
        },
    }),
});

const schema = new GraphQLSchema({
    query: RootQueryType,
});

app.use('/graphql', expressGraphQL.graphqlHTTP({
    graphiql: true,
    schema: schema,
}));
app.listen(5000, () => console.log('Server Running'));
