import Config from "../config";

const templates = {
    REGISTRATION_CONFIRMATION: `<!DOCTYPE html>
        <html>
            <body>
                <div class="container">
                    <p> Thank you for registering for R|P 2025. We have received your information, and will be sending next steps shortly.  </p>
                    
                    <p> Need to update your registration? Return to the 
                        <a href="${Config.WEB_REGISTER_ROUTE}">registration form</a>
                    to edit your responses!</p>

                    <p> For your reference, your submission included the following information: </p>
                    <ul>
                        <li> <b> Name: </b>  {{name}} </li>
                        <li> <b> School: </b>  {{school}} </li>
                        <li> <b> Education Level: </b>  {{educationLevel}} </li>
                        <li> <b> Major: </b>  {{major}} </li>
                        <li> <b> Graduation Year: </b>  {{graduationYear}} </li>
                        <li> <b> Dietary Restrictions: </b> {{dietaryRestrictions}} </li>
                        <li> <b> Allergies: </b> {{allergies}} </li>
                        <li> <b> Gender: </b> {{gender}} </li>
                        <li> <b> Race/Ethnicity: </b> {{ethnicity}} </li>
                        <li> <b> Personal Links: </b> {{personalLinks}} </li>
                        <li> <b> Interest Tags: </b> {{tags}} </li>
                        <li> <b> Opportunities Interest: </b> {{opportunities}} </li>
                    </ul>

                </div>
            </body>
        </html>
    `,

    SPONSOR_VERIFICATION: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
        <style>
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 50vh;
                margin: 0;
                font-family: Arial, sans-serif;
                background-color: #f7f7f7;
            }
            .container {
                background-color: #ffffff;
                padding: 20px 40px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                border-radius: 10px;
                text-align: center;
            }
            h1 {
                font-size: 24px;
                color: #333333;
                margin-bottom: 10px;
            }
            .code {
                font-size: 32px;
                font-weight: bold;
                color: #e74c3c;
                letter-spacing: 2px;
                background-color: #f2f2f2;
                padding: 10px 20px;
                border-radius: 5px;
                display: inline-block;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Here is your <a href="https://sponsor.reflectionsprojections.org/login/">SponsorRP</a> verification code:</h2>
            <div class="code">{{code}}</div>
            <p> Note that this verification code will expire approximately 10 minutes from now. </p>
        </div>
    </body>
    </html>`,
};

export default templates;
