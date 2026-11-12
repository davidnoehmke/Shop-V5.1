import {checkPreviewEnv} from './preview-env.mjs';

const {errors, warnings} = checkPreviewEnv(process.env);
for (const warning of warnings) console.warn(warning);
for (const error of errors) console.error(error);
if (errors.length) process.exitCode = 1;
else process.stdout.write('Required guest storefront configuration is present. Live API, publication and checkout QA are still required.\n');
