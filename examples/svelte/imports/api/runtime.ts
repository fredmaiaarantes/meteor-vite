import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

const RuntimeCollection = new Mongo.Collection<RuntimeDocument>('runtime');

Meteor.publish('runtime', () => {
    return RuntimeCollection.find();
});

Meteor.methods({
    'runtime.click': () => {
        const clicks = RuntimeCollection.findOne({ _id: 'clicks' })?.value || 0;
        RuntimeCollection.upsert({ _id: 'clicks' }, { $set: { value: clicks + 1 } });
    }
})

export interface RuntimeDocument {
    _id: 'clicks';
    value: number;
}

export default RuntimeCollection;