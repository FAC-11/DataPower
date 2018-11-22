/* global Instascan */
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import PurposeButton from '../components/purposeButton';
import QRPrivacy from '../components/qrprivacy';
import { Activities, Visitors, ErrorUtils, CbAdmin } from '../../api';
import { Heading, Paragraph, Link as HyperLink } from '../../shared/components/text/base';
import { FlexContainerRow, FlexContainerCol } from '../../shared/components/layout/base';

const StyledNav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyledSection = styled.section`
  margin: ${props => props.margin}rem 0;
  display: flex;
  justify-content: center;
`;

const BigFlexContainerRow = styled(FlexContainerRow)`
  width: 60%;
  padding: 1rem;
  flex-wrap: wrap;
  @media (min-width: 1000px) {
    width: 50%;
  }
`;

const SmallFlexContainerRow = styled(FlexContainerRow)`
  width: 40%;
  padding: 1rem;
  flex-wrap: wrap;
  @media (min-width: 1000px) {
    width: 50%;
  }
`;

const FlexItem = styled.div`
  flex: ${props => props.flex || '1'};
`;

const QrParagraph = styled(Paragraph)`
  text-align: center;
  margin-bottom: 3rem;
`;

const SnakeContainerRow = styled(FlexContainerRow)`
  width: 100%;
  justify-content: space-between;
  &:nth-child(2n) {
    flex-direction: row-reverse;
  }
`;

const capitaliseFirstName = name => name.split(' ')[0].replace(/\b\w/g, l => l.toUpperCase());

export default class QRCode extends Component {
  constructor() {
    super();

    this.state = {
      hasScanned: false,
      visitorId: null,
      visitorName: '',
      qrCodeContent: '',
      activities: [],
    };

    this.scanner = null;
    this.previewDiv = null;

    this.previewRef = (element) => {
      this.previewDiv = element;
    };
  }

  async componentDidMount() {
    await CbAdmin.downgradePermissions();

    this.scanner = this.scanner || new Instascan.Scanner({ video: this.previewDiv, scanPeriod: 5 });

    Instascan.Camera.getCameras()
      .then((cameras) => {
        if (cameras.length < 1) {
          throw new Error('No accessible cameras');
        }
        return this.scanner.start(cameras[0]);
      })
      .catch((err) => {
        console.log(err);
        this.props.history.push('/visitor/qrerror');
      });

    if (!this.state.hasScanned) {
      this.scanner.addListener('scan', (content) => {
        this.scanner.stop();

        Visitors.search({ qrCode: content })
          .then((res) => {
            if (!res.data.result) {
              throw new Error('No user found');
            }

            this.setState({
              visitorName: res.data.result.name,
              visitorId: res.data.result.id,
              qrCodeContent: content,
              hasScanned: true,
            });
          })
          .catch((err) => {
            console.log(err);
            this.props.history.push('/visitor/qrerror');
          });
      });
    }

    Activities.get({ day: 'today' })
      .then((res) => {
        this.setState({ activities: res.data.result });
      })
      .catch((error) => {
        if (ErrorUtils.errorStatusEquals(error, 401)) {
          this.props.history.push('/cb/login');

        } else if (ErrorUtils.errorStatusEquals(error, 500)) {
          this.props.history.push('/error/500');

        } else if (ErrorUtils.errorStatusEquals(error, 404)) {
          this.props.history.push('/error/404');

        } else {
          this.props.history.push('/visitor/qrerror');
        }
      });
  }

  componentWillUnmount() {
    if (this.scanner) {
      this.scanner.stop()
        .then(() => {
          this.scanner = null;
        });
    }
  }

  addVisitLog = (newActivity) => {
    const activity = this.state.activities.find(a => a.name === newActivity);

    if (!activity) {
      // TODO: Do something better here
      console.log('Activity not recognised');
      this.props.history.push('/error/unknown');
    }

    Visitors.createVisit({
      activityId: activity.id,
      visitorId: this.state.visitorId,
    })
      .then(() => this.props.history.push('/visitor/end'))
      .catch((error) => {
        console.log('ERROR @ Visitors.createVisit', error);
        this.props.history.push('/error/500');
      });
  };

  render() {
    if (!this.state.hasScanned) {
      return (
        <Fragment>
          <StyledNav>
            <FlexItem>
              <HyperLink to="/">Back to the main page</HyperLink>
            </FlexItem>
            <FlexItem flex="2">
              <Heading>Welcome Visitor!</Heading>
            </FlexItem>
            <FlexItem />
          </StyledNav>
          <StyledSection margin={0}>
            <FlexContainerCol>
              <QrParagraph>Please scan your QR code to log in</QrParagraph>
              <div>
                <video ref={this.previewRef} />
              </div>
            </FlexContainerCol>
          </StyledSection>
        </Fragment>
      );
    }
    return (
      <Fragment>
        <StyledNav>
          <Heading>
            Welcome back, {capitaliseFirstName(this.state.visitorName)}! Why are you here today?
          </Heading>
        </StyledNav>
        <StyledSection margin={3}>
          <BigFlexContainerRow>
            {this.state.activities
              .map((activity, index) => (
                <PurposeButton
                  key={activity.id}
                  color={index}
                  session={activity.name}
                  onClick={this.addVisitLog}
                />
              ))
              .reduce(
                (acc, el, index, array) =>
                  (index % 2 === 0
                    ? acc.concat([
                      <SnakeContainerRow key={el.key}>
                        {el} {array[index + 1]}
                      </SnakeContainerRow>,
                    ])
                    : acc),
                [],
              )}
          </BigFlexContainerRow>
          <SmallFlexContainerRow>
            <QRPrivacy />
          </SmallFlexContainerRow>
        </StyledSection>
      </Fragment>
    );
  }
}

withRouter(QRCode); // to get history and use history.push

QRCode.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func,
  }).isRequired,
};
