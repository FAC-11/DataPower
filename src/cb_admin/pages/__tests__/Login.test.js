import {
  fireEvent,
  cleanup,
  waitForElement,
  wait,
} from 'react-testing-library';
import MockAdapter from 'axios-mock-adapter';
import { renderWithRouter } from '../../../tests';
import Login from '../Login';
import { axios } from '../../../api';


describe('Login Component', () => {
  let mock;

  beforeAll(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(cleanup);

  test(':: incorrect user details returns 401 and displays error message', async () => {
    expect.assertions(1);

    mock.onPost('/users/login')
      .reply(401, { result: null, error: { message: 'Credentials not recognised' } });

    const { getByText, getByLabelText } = renderWithRouter()(Login);
    const email = getByLabelText('Email');
    const password = getByLabelText('Password');
    const submit = getByText('LOGIN');
    email.value = '123@hi.com';
    password.value = 'lolLOL123';
    fireEvent.change(email);
    fireEvent.change(password);
    fireEvent.click(submit);

    const error = await waitForElement(() => getByText('Credentials', { exact: false }));
    expect(error.textContent).toEqual('Credentials not recognised');
  });

  test(':: incorrect user returns 403 and displays error message', async () => {
    expect.assertions(1);

    mock.onPost('/users/login')
      .reply(403, { result: null, error: { statusCode: 403, type: 'Forbidden', message: 'User does not have required role' } });

    const { getByText, getByLabelText } = renderWithRouter()(Login);
    const email = getByLabelText('Email');
    const password = getByLabelText('Password');
    const submit = getByText('LOGIN');
    email.value = '123@hi.com';
    password.value = 'lolLOL123';
    fireEvent.change(email);
    fireEvent.change(password);
    fireEvent.click(submit);

    const error = await waitForElement(() => getByText('required', { exact: false }));
    expect(error.textContent).toEqual('User does not have required role');
  });

  test(':: correct user details returns 200 and redirects to homepage', async () => {
    expect.assertions(1);

    mock.onPost('/users/login')
      .reply(200, { });

    const { getByText, history, getByLabelText } = renderWithRouter({ route: '/login' })(Login);

    const email = getByLabelText('Email');
    const password = getByLabelText('Password');
    const submit = getByText('LOGIN');
    email.value = 'findmyfroggy@frogfinders.com';
    password.value = 'Funnyfingers11!';
    fireEvent.change(email);
    fireEvent.change(password);
    fireEvent.click(submit);

    await wait(() => expect(history.location.pathname).toEqual('/'));
  });
});

