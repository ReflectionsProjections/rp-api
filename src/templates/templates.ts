import Config from "../config";

const templates = {
    REGISTRATION_CONFIRMATION: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #0a0a0a;
            color: #ffffff;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #1a1a1a;
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
        }
        
        .header {
            background: linear-gradient(135deg, #8B0000 0%, #FF0000 50%, #8B0000 100%);
            padding: 30px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(255, 255, 255, 0.1) 10px,
                rgba(255, 255, 255, 0.1) 20px
            );
        }
        
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            position: relative;
            z-index: 1;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .welcome-text {
            font-size: 18px;
            margin-bottom: 25px;
            color: #ffffff;
        }
        
        .update-link {
            background-color: #2a2a2a;
            border: 2px solid #FF0000;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        
        .update-link a {
            color: #FF0000;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
        }
        
        .update-link a:hover {
            color: #ffffff;
            text-decoration: underline;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            margin: 30px 0 20px 0;
            color: #FF0000;
            border-bottom: 2px solid #FF0000;
            padding-bottom: 5px;
        }
        
        .info-grid {
            background-color: #2a2a2a;
            border-radius: 10px;
            padding: 25px;
            margin: 20px 0;
            border: 1px solid #333333;
        }
        
        .info-item {
            display: flex;
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #333333;
        }
        
        .info-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .info-label {
            font-weight: 600;
            color: #FF0000;
            min-width: 140px;
            flex-shrink: 0;
        }
        
        .info-value {
            color: #ffffff;
            flex: 1;
        }
        
        .nested-list {
            margin-left: 20px;
            margin-top: 8px;
        }
        
        .nested-list li {
            margin-bottom: 5px;
        }
        
        .nested-list a {
            color: #FF0000;
            text-decoration: none;
        }
        
        .nested-list a:hover {
            color: #ffffff;
            text-decoration: underline;
        }
        
        .resume-link {
            background: linear-gradient(135deg, #FF0000 0%, #8B0000 100%);
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            font-weight: 600;
            margin-top: 10px;
            transition: all 0.3s ease;
        }
        
        .resume-link:hover {
            background: linear-gradient(135deg, #8B0000 0%, #FF0000 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
        }
        
        .footer {
            background-color: #0a0a0a;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #333333;
            font-size: 14px;
            color: #888888;
        }
        
        @media (max-width: 600px) {
            .content {
                padding: 20px 15px;
            }
            
            .info-item {
                flex-direction: column;
            }
            
            .info-label {
                min-width: auto;
                margin-bottom: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>R|P 2025 Registration Confirmed</h1>
        </div>
        
        <div class="content">
            <p class="welcome-text">
                Thank you for registering for R|P 2025. We have received your information and will be sending next steps shortly.
            </p>
            
            <div class="update-link">
                Need to update your registration? 
                <a href="${Config.WEB_REGISTER_ROUTE}">Return to the registration form</a>
                to edit your responses!
            </div>
            
            <h2 class="section-title">Your Registration Details</h2>
            
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Name:</span>
                    <span class="info-value">{{name}}</span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">School:</span>
                    <span class="info-value">{{school}}</span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Education Level:</span>
                    <span class="info-value">{{educationLevel}}</span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Graduation Year:</span>
                    <span class="info-value">{{graduationYear}}</span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Majors:</span>
                    <span class="info-value">{{majors}}</span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Minors:</span>
                    <span class="info-value">{{minors}}</span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Dietary Restrictions:</span>
                    <span class="info-value">{{dietaryRestrictions}}</span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Allergies:</span>
                    <span class="info-value">{{allergies}}</span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Gender:</span>
                    <span class="info-value">{{gender}}</span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Race/Ethnicity:</span>
                    <span class="info-value">{{ethnicity}}</span>
                </div>
                
                {{#personalLinks.length}}
                <div class="info-item">
                    <span class="info-label">Personal Links:</span>
                    <span class="info-value">
                        <div class="nested-list">
                            {{#personalLinks}}<div><a href="{{.}}">{{.}}</a></div>{{/personalLinks}}
                        </div>
                    </span>
                </div>
                {{/personalLinks.length}}
                
                <div class="info-item">
                    <span class="info-label">Interested in MechMania:</span>
                    <span class="info-value">
                        {{#isInterestedMechMania}}Yes{{/isInterestedMechMania}}
                        {{^isInterestedMechMania}}No{{/isInterestedMechMania}}
                    </span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Interested in PuzzleBang:</span>
                    <span class="info-value">
                        {{#isInterestedPuzzleBang}}Yes{{/isInterestedPuzzleBang}}
                        {{^isInterestedPuzzleBang}}No{{/isInterestedPuzzleBang}}
                    </span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Interest Tags:</span>
                    <span class="info-value">{{tags}}</span>
                </div>
                
                <div class="info-item">
                    <span class="info-label">Opportunities Interest:</span>
                    <span class="info-value">{{opportunities}}</span>
                </div>
                
                {{#hasResume}}
                <div class="info-item">
                    <span class="info-label">Resume:</span>
                    <span class="info-value">
                        <a href="${Config.WEB_RESUME_ROUTE}" class="resume-link">View Your Resume</a>
                    </span>
                </div>
                {{/hasResume}}
            </div>
        </div>
        
        <div class="footer">
            <p>R|P 2025 • Reflections | Projections</p>
        </div>
    </div>
</body>
</html>`,
    REGISTRATION_CONFIRMATION_OLD: `<!DOCTYPE html>
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
                        <li> <b> Graduation Year: </b>  {{graduationYear}} </li>
                        <li> <b> Majors: </b>  {{majors}} </li>
                        <li> <b> Minors: </b>  {{minors}} </li>
                        <li> <b> Dietary Restrictions: </b> {{dietaryRestrictions}} </li>
                        <li> <b> Allergies: </b> {{allergies}} </li>
                        <li> <b> Gender: </b> {{gender}} </li>
                        <li> <b> Race/Ethnicity: </b> {{ethnicity}} </li>
                        {{#personalLinks.length}}
                        <li><b>Personal Links:</b>
                            <ul>
                                {{#personalLinks}}<li><a href="{{.}}">{{.}}</a></li>{{/personalLinks}}
                            </ul>
                        </li>
                        {{/personalLinks.length}}
                        {{#isInterestedMechMania}}
                        <li> <b> Interested in MechMania: </b> Yes </li>
                        {{/isInterestedMechMania}}
                        {{^isInterestedMechMania}}
                        <li> <b> Interested in MechMania: </b> No </li>
                        {{/isInterestedMechMania}}
                        {{#isInterestedPuzzleBang}}
                        <li> <b> Interested in PuzzleBang: </b> Yes </li>
                        {{/isInterestedPuzzleBang}}
                        {{^isInterestedPuzzleBang}}
                        <li> <b> Interested in PuzzleBang: </b> No </li>
                        {{/isInterestedPuzzleBang}}
                        <li> <b> Interest Tags: </b> {{tags}} </li>
                        <li> <b> Opportunities Interest: </b> {{opportunities}} </li>
                        {{#hasResume}}
                        <li>
                            <a href="${Config.WEB_RESUME_ROUTE}">View your uploaded resume</a>
                        </li>
                        {{/hasResume}}
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
