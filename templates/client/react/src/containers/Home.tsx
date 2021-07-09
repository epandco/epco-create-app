import Subtitle from '../components/Subtitle';

import styles from './Container.module.scss';

const Home = (): JSX.Element => {
  return (
    <div className={styles.container}>
      <h1>Welcome to the Home Page!</h1>
      <Subtitle />
    </div>
  );
};

export default Home;
