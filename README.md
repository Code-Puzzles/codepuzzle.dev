_Judge server for Return True to Win puzzles._

1. Run dev loop:
   - Install Node.js v18 or use nvm
   - Install dependencies: `npm install`
   - `npm run dev`
1. Deploy to AWS for testing:
   - Create AWS/Pulumi accounts if necessary
   - Install [Pulumi CLI](https://www.pulumi.com/docs/clouds/aws/get-started/begin/)
   - Set these environment variables before deploy (eg. with a `.env` file):
     ```sh
     export AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
     export AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
     ```
   - `npm run deploy`
