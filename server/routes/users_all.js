const router = require('express').Router();
const { filter, identity, pipe, omit, assoc } = require('ramda');
const usersAll = require('../database/queries/users_all');
const Joi = require('joi');
const { validate } = require('../shared/middleware');
const { ageRange, renameKeys } = require('../shared/util/helpers');

const schema = {
  query: {
    pagination: Joi.bool(),
    offset: Joi.number()
      .integer()
      .min(0),
    sort: Joi.any().valid(
      '',
      'id',
      'name',
      'email',
      'gender',
      'yob',
      'email_consent',
      'sms_consent'
    ),
    gender: Joi.any().valid('', 'male', 'female', 'prefer not to say'),
    age: Joi.any().valid('', '0-17', '18-34', '35-50', '51-69', '70+'),
    is_sms_contact_consent_granted: Joi.bool(),
    is_email_contact_consent_granted: Joi.bool(),
  },
};

const removeProperties = omit(['sort', 'offset', 'age', 'pagination']);
const removeEmpty = filter(identity);
const renameGender = renameKeys({ gender: 'sex' });

router.get('/', validate(schema), async (req, res, next) => {
  try {
    const query = req.query;

    const addCbId = assoc('cb_id', req.auth.cb_id);
    const createWhereObj = pipe(renameGender, removeProperties, removeEmpty, addCbId);

    const options = {
      where: createWhereObj(query),
      between: query.age ? { column: 'yearofbirth', values: ageRange(query.age) } : null,
      sort: query.sort ? query.sort : null,
      pagination: query.pagination ? { offset: query.offset } : null,
    };

    if (query.sms) {
      assoc('is_sms_contact_consent_granted', true, options.where);
    }
    if (query.email) {
      assoc('is_email_contact_consent_granted', true, options.where);
    }

    const result = await usersAll(req.app.get('client:psql'), options);
    res.send({ result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
