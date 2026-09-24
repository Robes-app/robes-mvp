import { App } from 'aws-cdk-lib';
import { buildApp } from '../src/app';

const app = new App();
buildApp(app);
app.synth();
