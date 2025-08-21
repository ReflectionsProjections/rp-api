import Config from "../config";

const templates = {
    REGISTRATION_CONFIRMATION: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset and compatibility */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100% !important;
            -ms-text-size-adjust: 100% !important;
        }
        
        table, td {
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
        }
        
        /* Force colors in dark mode */
        [data-ogsc] *,
        [data-ogsb] *,
        .darkmode *,
        [data-darkreader] *,
        u + .body * {
            background-color: transparent !important;
        }
        
        [data-ogsc] .email-container,
        [data-ogsb] .email-container,
        .darkmode .email-container {
            background-color: #ffffff !important;
        }
        
        [data-ogsc] .main-bg,
        [data-ogsb] .main-bg,
        .darkmode .main-bg {
            background-color: #f8f9fa !important;
        }
        
        [data-ogsc] .header-bg,
        [data-ogsb] .header-bg,
        .darkmode .header-bg {
            background-color: #c0392b !important;
        }
        
        [data-ogsc] .info-bg,
        [data-ogsb] .info-bg,
        .darkmode .info-bg {
            background-color: #f8f9fa !important;
        }
        
        /* Outlook link fixes */
        [data-ogsc] a,
        [data-ogsb] a,
        .darkmode a {
            color: #c0392b !important;
            text-decoration: underline !important;
        }
        
        /* Main styles */
        body {
            margin: 0 !important;
            padding: 0 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            background-color: #f8f9fa !important;
            color: #2c3e50 !important;
            line-height: 1.6 !important;
        }
        
        .main-bg {
            background-color: #f8f9fa !important;
            padding: 20px 0 !important;
            width: 100% !important;
        }
        
        .email-container {
            max-width: 600px !important;
            margin: 0 auto !important;
            background-color: #ffffff !important;
            border: 1px solid #e1e8ed !important;
            border-radius: 8px !important;
            overflow: hidden !important;
        }
        
        .header-table {
            width: 100% !important;
            border-collapse: collapse !important;
        }
        
        .header-bg {
            background-color: #c0392b !important;
            padding: 30px 20px !important;
            text-align: center !important;
        }
        
        .header-title {
            margin: 0 !important;
            font-size: 24px !important;
            font-weight: bold !important;
            letter-spacing: 1px !important;
            text-transform: uppercase !important;
            color: #ffffff !important;
            font-family: Arial, Helvetica, sans-serif !important;
        }
        
        .content-table {
            width: 100% !important;
            border-collapse: collapse !important;
        }
        
        .content-area {
            padding: 40px 30px !important;
            background-color: #ffffff !important;
        }
        
        .welcome-text {
            font-size: 16px !important;
            margin: 0 0 25px 0 !important;
            color: #2c3e50 !important;
            line-height: 1.6 !important;
            font-family: Arial, Helvetica, sans-serif !important;
        }
        
        .update-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 25px 0 !important;
        }
        
        .update-box {
            background-color: #f8f9fa !important;
            border: 2px solid #c0392b !important;
            border-radius: 8px !important;
            padding: 20px !important;
            text-align: center !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 16px !important;
            color: #2c3e50 !important;
        }
        
        /* Outlook-specific link styling */
        .update-link {
            color: #c0392b !important;
            text-decoration: underline !important;
            font-weight: bold !important;
            font-size: 16px !important;
            font-family: Arial, Helvetica, sans-serif !important;
        }
        
        /* Additional Outlook link fixes */
        span.MsoHyperlink {
            color: #c0392b !important;
            text-decoration: underline !important;
        }
        
        span.MsoHyperlinkFollowed {
            color: #a93226 !important;
            text-decoration: underline !important;
        }
        
        .section-title {
            font-size: 18px !important;
            font-weight: bold !important;
            margin: 30px 0 20px 0 !important;
            color: #c0392b !important;
            border-bottom: 2px solid #c0392b !important;
            padding-bottom: 5px !important;
            font-family: Arial, Helvetica, sans-serif !important;
        }
        
        .info-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 20px 0 !important;
        }
        
        .info-bg {
            background-color: #f8f9fa !important;
            border-radius: 8px !important;
        }
        
        .info-row {
            border-bottom: 1px solid #ecf0f1 !important;
        }
        
        .info-row:last-child {
            border-bottom: none !important;
        }
        
        .info-label {
            font-weight: bold !important;
            color: #7f8c8d !important;
            width: 140px !important;
            padding: 12px 15px !important;
            vertical-align: top !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 14px !important;
        }
        
        .info-value {
            color: #2c3e50 !important;
            padding: 12px 15px !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 14px !important;
        }
        
        .nested-link {
            color: #c0392b !important;
            text-decoration: underline !important;
            font-family: Arial, Helvetica, sans-serif !important;
        }
        
        .resume-table {
            margin-top: 10px !important;
        }
        
        .resume-button {
            background-color: #c0392b !important;
            color: #ffffff !important;
            padding: 10px 20px !important;
            text-decoration: none !important;
            border-radius: 6px !important;
            display: inline-block !important;
            font-weight: bold !important;
            font-size: 14px !important;
            font-family: Arial, Helvetica, sans-serif !important;
            border: none !important;
        }
        
        .footer-table {
            width: 100% !important;
            border-collapse: collapse !important;
        }
        
        .footer-area {
            background-color: #ecf0f1 !important;
            padding: 20px !important;
            text-align: center !important;
            border-top: 1px solid #bdc3c7 !important;
            font-size: 14px !important;
            color: #7f8c8d !important;
            font-family: Arial, Helvetica, sans-serif !important;
        }
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {
            .content-area {
                padding: 20px 15px !important;
            }
            
            .info-label,
            .info-value {
                display: block !important;
                width: 100% !important;
                padding: 8px 15px !important;
            }
            
            .info-label {
                padding-bottom: 4px !important;
            }
        }
    </style>
</head>
<body>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="main-bg">
        <tr>
            <td align="center">
                <table class="email-container" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td>
                            <table class="header-table" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td class="header-bg">
                                        <h1 class="header-title">R|P 2025 Registration Confirmed</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td>
                            <table class="content-table" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td class="content-area">
                                        <p class="welcome-text">
                                            Thank you for registering for R|P 2025. We have received your information and will be sending next steps shortly.
                                        </p>
                                        
                                        <table class="update-table" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td class="update-box">
                                                    Need to update your registration? 
                                                    <a href="${Config.WEB_REGISTER_ROUTE}" class="update-link">Return to the registration form</a>
                                                    to edit your responses!
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <h2 class="section-title">Your Registration Details</h2>
                                        
                                        <table class="info-table" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td class="info-bg">
                                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                        <tr class="info-row">
                                                            <td class="info-label">Name:</td>
                                                            <td class="info-value">{{name}}</td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">School:</td>
                                                            <td class="info-value">{{school}}</td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Education Level:</td>
                                                            <td class="info-value">{{educationLevel}}</td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Graduation Year:</td>
                                                            <td class="info-value">{{graduationYear}}</td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Majors:</td>
                                                            <td class="info-value">{{majors}}</td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Minors:</td>
                                                            <td class="info-value">{{minors}}</td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Dietary Restrictions:</td>
                                                            <td class="info-value">{{dietaryRestrictions}}</td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Allergies:</td>
                                                            <td class="info-value">{{allergies}}</td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Gender:</td>
                                                            <td class="info-value">{{gender}}</td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Race/Ethnicity:</td>
                                                            <td class="info-value">{{ethnicity}}</td>
                                                        </tr>
                                                        {{#personalLinks.length}}
                                                        <tr class="info-row">
                                                            <td class="info-label">Personal Links:</td>
                                                            <td class="info-value">
                                                                {{#personalLinks}}<a href="{{.}}" class="nested-link">{{.}}</a><br>{{/personalLinks}}
                                                            </td>
                                                        </tr>
                                                        {{/personalLinks.length}}
                                                        <tr class="info-row">
                                                            <td class="info-label">Interested in MechMania:</td>
                                                            <td class="info-value">
                                                                {{#isInterestedMechMania}}Yes{{/isInterestedMechMania}}
                                                                {{^isInterestedMechMania}}No{{/isInterestedMechMania}}
                                                            </td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Interested in PuzzleBang:</td>
                                                            <td class="info-value">
                                                                {{#isInterestedPuzzleBang}}Yes{{/isInterestedPuzzleBang}}
                                                                {{^isInterestedPuzzleBang}}No{{/isInterestedPuzzleBang}}
                                                            </td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Interest Tags:</td>
                                                            <td class="info-value">{{tags}}</td>
                                                        </tr>
                                                        <tr class="info-row">
                                                            <td class="info-label">Opportunities Interest:</td>
                                                            <td class="info-value">{{opportunities}}</td>
                                                        </tr>
                                                        {{#hasResume}}
                                                        <tr class="info-row">
                                                            <td class="info-label">Resume:</td>
                                                            <td class="info-value">
                                                                <table class="resume-table" cellpadding="0" cellspacing="0" border="0">
                                                                    <tr>
                                                                        <td>
                                                                            <a href="${Config.WEB_RESUME_ROUTE}" class="resume-button">View Your Resume</a>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        {{/hasResume}}
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td>
                            <table class="footer-table" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td class="footer-area">
                                        R|P 2025 • Reflections | Projections
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
