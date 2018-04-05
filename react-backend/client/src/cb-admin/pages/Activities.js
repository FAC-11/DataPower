import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { assocPath, dissoc, invertObj } from 'ramda';
import { FlexContainerCol } from '../../shared/components/layout/base';
import { Paragraph, Heading, Link as HyperLink } from '../../shared/components/text/base';
import { Form, PrimaryButton } from '../../shared/components/form/base';
import LabelledInput from '../../shared/components/form/LabelledInput';
import LabelledSelect from '../../shared/components/form/LabelledSelect';
import Checkbox from '../components/Checkbox';
import { Activities } from '../../api';
import ActivityLabel from '../components/ActivityLabel';


const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
`;

const FlexItem = styled.div`
  flex: ${props => props.flex || '1'};
`;

const SubmitButton = PrimaryButton.extend`
  margin-left: 2em;
  height: 3em;
`;

const Table = styled.table`
  background: transparent;
  width: 100%;
  padding: 2em;
`;
const TableHead = styled.thead``;
const TableBody = styled.tbody``;
const TableRow = styled.tr`
  height: 3em;
`;
const TableCell = styled.td`
  text-align: ${props => (props.center ? 'center' : 'left')};
`;
const TableHeader = styled.th``;


const categories = [
  { key: '0', value: '' },
  { key: '1', value: 'Sports' },
  { key: '2', value: 'Arts, Craft, and Music' },
  { key: '3', value: 'Physical health and wellbeing' },
  { key: '4', value: 'Socialising' },
  { key: '5', value: 'Adult skills building' },
  { key: '6', value: 'Education support' },
  { key: '7', value: 'Employment support' },
  { key: '8', value: 'Business support' },
  { key: '9', value: 'Care service' },
  { key: '10', value: 'Mental health support' },
  { key: '11', value: 'Housing support' },
  { key: '12', value: 'Work space' },
  { key: '13', value: 'Food' },
  { key: '14', value: 'Outdoor work and gardening' },
  { key: '15', value: 'Local products' },
  { key: '16', value: 'Environment and conservation work' },
  { key: '17', value: 'Transport' },
];

const keyMap = {
  name: 'Activity',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};
const colToState = invertObj(keyMap);
const columns = Object.values(keyMap);


export default class ActivitiesPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activities: {
        items: {},
        order: [],
      },
      form: {},
      errors: {},
    };
  }

  componentDidMount() {
    Activities.get(this.props.auth)
      .then((res) => {
        const activities = res.data.result;

        const order = activities.map(activity => activity.id);
        const items = activities.reduce((acc, activity) => {
          acc[activity.id] = activity;
          return acc;
        }, {});
        this.setState(state => ({ ...state, activities: { items, order } }));

        this.props.updateAdminToken(res.headers.authorization);
      })
      .catch((error) => {
        switch (error.status) {
          case 401:
            return this.props.history.push('/admin/login');

          case 500:
            return this.props.history.push('/internalServerError');

          default:
            return this.props.history.push('/admin/login');
        }
      });
  }

  onChange = e =>
    this.setState(assocPath(['form', e.target.name], e.target.value))

  toggleCheckbox = (id, day) => {
    const current = this.state.activities.items[id][day];

    Activities.update(this.props.auth, { id, [day]: !current })
      .then((res) => {
        this.props.updateAdminToken(res.headers.authorization);
        this.setState(assocPath(['activities', 'items', id], res.data.result));
      })
      .catch(error =>
        (error.message === 'No admin token'
          ? this.props.history.push('/admin/login')
          : this.setState({ errors: { general: 'Could not add activity' } })),
      );
  }

  addActivity = (e) => {
    e.preventDefault();

    Activities.create(this.props.auth, this.state.form)
      .then(res =>
        this.setState((state) => {
          const item = res.data.result;
          const order = state.activities.order.concat(item.id);
          return {
            ...state,
            activities: {
              items: { ...state.activities.items, [item.id]: item },
              order,
            },
          };
        }),
      )
      .catch(error => (
        error.message === 'No admin token'
          ? this.props.history.push('/admin/login')
          : this.setState({ errors: { general: 'Could not add activity' } })
      ));
  }

  deleteActivity = (id) => {
    Activities.delete(this.props.auth, { id })
      .then((res) => {
        this.props.updateAdminToken(res.headers.authorization);
        this.setState((state) => {
          const order = state.activities.order.filter(i => i !== id);
          const items = dissoc(id, state.activities.items);
          return { ...state, activities: { order, items } };
        });
      })
      .catch(error =>
        (error.message === 'No admin token'
          ? this.props.history.push('/admin/login')
          : this.setState({ errors: { general: 'Could not add activity' } })),
      );
  }

  render() {
    const { errors } = this.state;

    return (
      <FlexContainerCol expand>
        <Nav>
          <HyperLink to="/admin"> Back to dashboard </HyperLink>
          <Heading flex={2}>Visitor details</Heading>
          <FlexItem />
        </Nav>
        <Paragraph>
          Add and edit the services, activities, and events being offered at your community
          business here. You can select which days of the week each of them will be available
          to your visitors, and just deselect all days if the one you are editing is a one-off
          event or not currently on the agenda.
        </Paragraph>
        <Form onSubmit={this.addActivity} onChange={this.onChange}>
          <LabelledInput
            id="cb-admin-activities-name"
            label="Add an activity"
            name="name"
            type="text"
            error={errors.activity}
            required
          />
          <LabelledSelect
            id="cb-admin-activities-category"
            label="Category"
            name="category"
            options={categories}
            error={errors.activity}
            required
          />
          <SubmitButton type="submit">ADD</SubmitButton>
        </Form>
        <Table>
          <TableHead>
            <TableRow>
              {
                columns.map(col => <TableHeader key={col}>{col}</TableHeader>)
              }
            </TableRow>
          </TableHead>
          <TableBody>
            {
              this.state.activities.order.map((id) => {
                const activity = this.state.activities.items[id];

                return (
                  <TableRow key={activity.name}>
                    {
                      columns
                        .map(k => colToState[k])
                        .map(k => (
                          <TableCell key={`${activity[k]}-${k}`} center={k !== 'name'}>
                            {
                              (k === 'name')
                                ? (
                                  <ActivityLabel
                                    label={activity[k]}
                                    onClick={() => this.deleteActivity(activity.id)}
                                  />)
                                : (
                                  <Checkbox
                                    id={`${activity.id}-${k}`}
                                    name={`${activity.id}-${k}`}
                                    checked={activity[k]}
                                    onChange={() => this.toggleCheckbox(activity.id, k)}
                                  />
                                )
                            }
                          </TableCell>
                        ))
                    }
                  </TableRow>
                );
              })
            }
          </TableBody>
        </Table>
      </FlexContainerCol>
    );
  }
}

ActivitiesPage.propTypes = {
  auth: PropTypes.string.isRequired,
  updateAdminToken: PropTypes.func.isRequired,
  history: PropTypes.shape({ push: PropTypes.func }).isRequired,
};
