const test = require('tape');
const pg = require('pg');
const { getConfig } = require('../../../config');
const refreshDB = require('../../../db/scripts/refresh');
const emptyDB = require('../../../db/scripts/empty');
const activities = require('../../../react-backend/database/queries/activities');
const activitiesForToday = require('../../../react-backend/database/queries/activities_today');
const deleteActivity = require('../../../react-backend/database/queries/activity_delete');
const insertActivity = require('../../../react-backend/database/queries/activity_add');
const updateActivity = require('../../../react-backend/database/queries/activity_update');

const config = getConfig(process.env.NODE_ENV);

test('Tests activities responds with the correct data', async (t) => {
  await refreshDB();

  const client = new pg.Client(config.psql);
  await client.connect();

  const activityArray = await activities(client, 1);

  t.equal(activityArray.length, 5, 'Activities gets all activities');
  t.equal(Object.keys(activityArray[0]).length, 9, 'Activity has 9 fields');

  try {
    await activities(client);
    t.fail('Worked without a cb id');
  } catch (e) {
    t.pass('Activities errors when no cb id given');
  }

  await emptyDB();

  const activityArrayEmpty = await activities(client, 1);

  t.deepEqual(activityArrayEmpty, [], 'No error if activities is called on empty table');

  await client.end()
  t.end();
});

test('Tests activitiesForToday responds with activities by day', async (t) => {
  await refreshDB();

  const client = new pg.Client(config.psql);
  await client.connect();

  const activitiesMonday = await activitiesForToday(client, 1, 'monday');
  const activitiesTuesday = await activitiesForToday(client, 1, 'tuesday');
  const badCbId = await activitiesForToday(client, 500, 'monday');

  try {
    await activitiesForToday(client, 2, null);
    t.fail('Worked with a bad day value');
  } catch (e) {
    t.pass('Bad values rejected');
  }
  try {
    await activitiesForToday(client, null, 'monday');
    t.fail('Worked without a cb id');
  } catch (e) {
    t.pass('Bad values rejected');
  }

  t.equal(activitiesMonday.length, 5, 'Gets activities filtered by day');
  t.equal(activitiesTuesday.length, 5, 'Different activities for another day');
  t.equal(badCbId.length, 0, 'Bad cbId returns no activities');

  await client.end()
  t.end();
});

test('Tests deleteActivity deletes an activity', async (t) => {
  await refreshDB();

  const client = new pg.Client(config.psql);
  await client.connect();

  const activitiesPreDelete = await activities(client, 1);
  await deleteActivity(client, 1, 1);
  const activitiesPostDelete = await activities(client, 1);

  t.notDeepEqual(activitiesPreDelete, activitiesPostDelete);

  await refreshDB();

  const badActivitiesPreDelete = await activities(client, 2);
  try {
    await deleteActivity(client, 1);
  } catch (e) {
    t.pass('Bad values rejected');
  }
  const badActivitiesPostDelete = await activities(client, 2);
  t.deepEqual(badActivitiesPreDelete, badActivitiesPostDelete);

  await client.end()
  t.end();
});

test('Tests insertActivity inserts an activity', async (t) => {
  await refreshDB();

  const client = new pg.Client(config.psql);
  await client.connect();

  const activitiesPreInsert = await activities(client, 2);
  const newId = await insertActivity(client, 'Test', 2);
  const activitiesPostInsert = await activities(client, 2);

  t.notEqual(
    activitiesPreInsert.length,
    activitiesPostInsert.length,
    'Inserted activity!',
  );
  t.equal(newId, 6, 'Query returns the id of the new activity');

  try {
    await insertActivity(client, '', 2);
    t.fail('Worked with no name');
  } catch (e) {
    t.pass('Bad name rejected');
  }

  try {
    await insertActivity(client, 'blah', null);
    t.fail('Worked with no cb id');
  } catch (e) {
    t.pass('No CB rejected');
  }

  try {
    await insertActivity(client, null, null);
  } catch (e) {
    t.pass('Bad values rejected');
  }

  await client.end()
  t.end();
});

test('Tests updateAcivity updates an activity', async (t) => {
  await refreshDB();

  const client = new pg.Client(config.psql);
  await client.connect();

  const activitiesPreUpdate = await activities(client, 1);
  await updateActivity(client, 1, true, true, true, true, true, true, true, 1);
  const activitiesPostUpdate = await activities(client, 1);

  t.notDeepEqual(activitiesPreUpdate, activitiesPostUpdate, 'Updated activity');

  try {
    await updateActivity(client, null, true, true, true, true, true, true, true, null);
    t.fail('Worked with bad inputs');
  } catch (e) {
    t.pass('Bad values rejected');
  }

  try {
    await updateActivity(client, 1, 'blah', true, true, true, true, true, true, 1);
    t.fail('Worked with bad inputs');
  } catch (e) {
    t.pass('Bad values rejected');
  }

  await client.end()
  t.end();
});
