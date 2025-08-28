import Config from "../config";

const templates = {
    REGISTRATION_CONFIRMATION: `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style type="text/css">
            body,
            table,
            td,
            p,
            a,
            li,
            blockquote {
                -webkit-text-size-adjust: 100% !important;
                -ms-text-size-adjust: 100% !important;
            }

            table,
            td {
                mso-table-lspace: 0pt !important;
                mso-table-rspace: 0pt !important;
            }

            /* not showing broken image thingie */
            img {
                -ms-interpolation-mode: bicubic !important;
                border: 0 !important;
                outline: none !important;
                text-decoration: none !important;
                display: block !important;
            }

            /* dark mode */
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
                background-color: #1a1a1a !important;
            }

            [data-ogsc] .main-bg,
            [data-ogsb] .main-bg,
            .darkmode .main-bg {
                background-color: #0d0d0d !important;
            }

            [data-ogsc] .header-bg,
            [data-ogsb] .header-bg,
            .darkmode .header-bg {
                background-color: #1a1a1a !important;
            }

            [data-ogsc] .info-bg,
            [data-ogsb] .info-bg,
            .darkmode .info-bg {
                background-color: #2a2a2a !important;
            }

            [data-ogsc] a,
            [data-ogsb] a,
            .darkmode a {
                color: #ff0000 !important;
                text-decoration: none !important;
                border-bottom: 1px solid #ff0000 !important;
            }

            body {
                margin: 0 !important;
                padding: 0 !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                background-color: #0d0d0d !important;
                color: #ffffff !important;
                line-height: 1.6 !important;
            }

            .main-bg {
                background-color: #0d0d0d !important;
                padding: 20px 0 !important;
                width: 100% !important;
            }

            .email-container {
                max-width: 600px !important;
                margin: 0 auto !important;
                background-color: #1a1a1a !important;
                border: 2px solid #ff0000 !important;
                overflow: hidden !important;
                position: relative !important;
            }

            .top-border {
                height: 4px !important;
                background: repeating-linear-gradient(
                    90deg,
                    #ff0000 0px,
                    #ff0000 20px,
                    #1a1a1a 20px,
                    #1a1a1a 40px
                ) !important;
            }

            .header-table {
                width: 100% !important;
                border-collapse: collapse !important;
                background: linear-gradient(
                    135deg,
                    #1a1a1a 0%,
                    #2a1a1a 100%
                ) !important;
            }

            .header-bg {
                background: linear-gradient(
                    135deg,
                    #1a1a1a 0%,
                    #2a1a1a 100%
                ) !important;
                text-align: center !important;
                padding: 0 !important;
                position: relative !important;
                min-height: 120px !important;
                vertical-align: middle !important;
            }

            .header-image-container {
                position: relative !important;
                display: block !important;
                width: 100% !important;
                min-height: 120px !important;
                background: linear-gradient(
                    135deg,
                    #1a1a1a 0%,
                    #2a1a1a 100%
                ) !important;
                text-align: center !important;
                vertical-align: middle !important;
            }

            .header-image {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
                margin: 0 auto !important;
                border: none !important;
                vertical-align: middle !important;
            }

            /* Enhanced fallback styling */
            .header-fallback {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                display: none !important;
                background: linear-gradient(
                    135deg,
                    #1a1a1a 0%,
                    #2a1a1a 100%
                ) !important;
                text-align: center !important;
                vertical-align: middle !important;
            }

            .header-fallback-inner {
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: 90% !important;
                max-width: 400px !important;
            }

            /* Outlook-specific fallback */
            .header-fallback-outlook {
                text-align: center !important;
                padding: 40px 20px !important;
                background: linear-gradient(
                    135deg,
                    #1a1a1a 0%,
                    #2a1a1a 100%
                ) !important;
                min-height: 120px !important;
                vertical-align: middle !important;
            }

            .header-fallback-outlook table {
                width: 100% !important;
                height: 120px !important;
                border-collapse: collapse !important;
            }

            .header-fallback-outlook td {
                vertical-align: middle !important;
                text-align: center !important;
            }

            .year-badge {
                font-size: 12px !important;
                font-weight: bold !important;
                color: #cccccc !important;
                letter-spacing: 2px !important;
                margin: 0 0 15px 0 !important;
                text-transform: uppercase !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                display: block !important;
                line-height: 1.2 !important;
            }

            .header-title {
                margin: 0 !important;
                font-size: 28px !important;
                font-weight: bold !important;
                letter-spacing: 3px !important;
                text-transform: uppercase !important;
                color: #ffffff !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                display: block !important;
                line-height: 1.1 !important;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
            }

            .title-separator {
                color: #ff0000 !important;
                margin: 0 10px !important;
                font-weight: normal !important;
                text-shadow: 0 0 10px #ff0000 !important;
            }

            .header-decoration {
                margin: 15px 0 0 0 !important;
                height: 2px !important;
                width: 80px !important;
                background: linear-gradient(
                    90deg,
                    transparent,
                    #ff0000,
                    transparent
                ) !important;
                margin-left: auto !important;
                margin-right: auto !important;
            }

            .header-bottom-border {
                height: 3px !important;
                background-color: #ff0000 !important;
                position: relative !important;
            }

            .header-bottom-border::after {
                content: "" !important;
                position: absolute !important;
                bottom: -2px !important;
                left: 0 !important;
                right: 0 !important;
                height: 2px !important;
                background: repeating-linear-gradient(
                    90deg,
                    #ff0000 0px,
                    #ff0000 10px,
                    transparent 10px,
                    transparent 20px
                ) !important;
            }

            .content-table {
                width: 100% !important;
                border-collapse: collapse !important;
            }

            .content-area {
                padding: 40px 30px !important;
                background-color: #1a1a1a !important;
            }

            .welcome-text {
                font-size: 16px !important;
                margin: 0 0 25px 0 !important;
                color: #e0e0e0 !important;
                line-height: 1.6 !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
            }

            .update-table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 25px 0 !important;
            }

            .update-box {
                background-color: #2a2a2a !important;
                border: 2px solid #ff0000 !important;
                padding: 20px !important;
                text-align: center !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                font-size: 16px !important;
                color: #ffffff !important;
                position: relative !important;
            }

            .update-link {
                color: #ff0000 !important;
                text-decoration: none !important;
                font-weight: bold !important;
                font-size: 16px !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                border-bottom: 1px solid #ff0000 !important;
            }

            /* Outlook link styling */
            span.MsoHyperlink {
                color: #ff0000 !important;
                text-decoration: none !important;
                border-bottom: 1px solid #ff0000 !important;
            }

            span.MsoHyperlinkFollowed {
                color: #cc0000 !important;
                text-decoration: none !important;
                border-bottom: 1px solid #cc0000 !important;
            }

            .section-title {
                font-size: 18px !important;
                font-weight: bold !important;
                margin: 30px 0 20px 0 !important;
                color: #ffffff !important;
                text-transform: uppercase !important;
                letter-spacing: 1px !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                position: relative !important;
                padding-bottom: 10px !important;
            }

            .section-title::after {
                content: "" !important;
                position: absolute !important;
                bottom: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 2px !important;
                background: linear-gradient(
                    90deg,
                    #ff0000,
                    #ff4444,
                    #ff0000
                ) !important;
            }

            .accent-line {
                width: 100% !important;
                height: 2px !important;
                background: linear-gradient(
                    90deg,
                    #ff0000,
                    #ff4444,
                    #ff0000
                ) !important;
                margin: 20px 0 !important;
                border: none !important;
            }

            .info-table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 20px 0 !important;
                border: 1px solid #333333 !important;
            }

            .info-bg {
                background-color: #1a1a1a !important;
            }

            .info-row {
                border-bottom: 1px solid #333333 !important;
            }

            .info-row:last-child {
                border-bottom: none !important;
            }

            .info-label {
                font-weight: bold !important;
                color: #ffffff !important;
                width: 140px !important;
                padding: 12px 15px !important;
                vertical-align: top !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                font-size: 14px !important;
                background-color: #2a2a2a !important;
                border-right: 2px solid #ff0000 !important;
            }

            .nested-link {
                color: #ff0000 !important;
                text-decoration: none !important;
                border-bottom: 1px solid #ff0000 !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                word-break: break-all !important;
                overflow-wrap: break-word !important;
                max-width: 100% !important;
                display: inline-block !important;
            }
            
            .info-value {
                color: #e0e0e0 !important;
                padding: 12px 15px !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                font-size: 14px !important;
                background-color: #1a1a1a !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                max-width: 0 !important;
            }
            
            a {
                word-break: break-all !important;
                overflow-wrap: break-word !important;
                max-width: 100% !important;
            }
            
            @media only screen and (max-width: 600px) {
                .content-area {
                    padding: 20px 15px !important;
                }
            
                .info-label,
                .info-value {
                    display: block !important;
                    width: 100% !important;
                    padding: 8px 15px !important;
                    border-right: none !important;
                    font-size: 12px !important;
                }
            
                .info-label {
                    padding-bottom: 4px !important;
                    border-bottom: 1px solid #ff0000 !important;
                }
            
                .header-title {
                    font-size: 22px !important;
                    letter-spacing: 2px !important;
                }
            
                .header-image-container {
                    min-height: 100px !important;
                }
            
                .header-fallback-outlook {
                    padding: 25px 15px !important;
                }
            
                .year-badge {
                    font-size: 11px !important;
                }
            
                .title-separator {
                    margin: 0 5px !important;
                }
            
                .nested-link {
                    font-size: 12px !important;
                    word-break: break-all !important;
                }
            }

            .resume-table {
                margin-top: 10px !important;
            }

            .resume-button {
                background: linear-gradient(
                    135deg,
                    #ff0000,
                    #cc0000
                ) !important;
                color: #ffffff !important;
                padding: 12px 24px !important;
                text-decoration: none !important;
                display: inline-block !important;
                font-weight: bold !important;
                font-size: 14px !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                border: 2px solid #ff0000 !important;
                text-transform: uppercase !important;
                letter-spacing: 1px !important;
            }

            .footer-table {
                width: 100% !important;
                border-collapse: collapse !important;
            }

            .footer-area {
                background-color: #0d0d0d !important;
                padding: 20px !important;
                text-align: center !important;
                font-size: 14px !important;
                color: #888888 !important;
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
                position: relative !important;
            }

            /* Footer top border */
            .footer-top-border {
                height: 2px !important;
                background-color: #ff0000 !important;
                position: relative !important;
            }

            .footer-top-border::before {
                content: "" !important;
                position: absolute !important;
                top: -2px !important;
                left: 0 !important;
                right: 0 !important;
                height: 2px !important;
                background: repeating-linear-gradient(
                    90deg,
                    #ff0000 0px,
                    #ff0000 10px,
                    transparent 10px,
                    transparent 20px
                ) !important;
            }

            .fallback-no-transform {
                padding: 40px 20px !important;
                text-align: center !important;
            }
        </style>
    </head>
    <body>
        <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            class="main-bg"
        >
            <tr>
                <td align="center">
                    <table
                        class="email-container"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                    >
                        <!-- Top geometric border -->
                        <tr>
                            <td class="top-border"></td>
                        </tr>

            <tr>
                <td>
                    <table
                        class="header-table"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                    >
                        <tr>
                            <td class="header-bg">
                                
                                <!-- Outlook Fallback -->
                                <!--[if mso]>
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #1a1a1a 0%, #2a1a1a 100%);">
                                    <tr>
                                        <td class="header-fallback-outlook">
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="vertical-align: middle; text-align: center; padding: 40px 20px;">
                                                        <div class="year-badge" style="font-size: 12px; font-weight: bold; color: #cccccc; letter-spacing: 2px; margin: 0 0 15px 0; text-transform: uppercase; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                                                            2025 PRESENTS
                                                        </div>
                                                        <div class="header-title" style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.1;">
                                                            REFLECTIONS<span style="color: #ff0000; margin: 0 10px;">|</span>PROJECTIONS
                                                        </div>
                                                        <div class="header-decoration" style="margin: 15px auto 0; height: 2px; width: 80px; background: linear-gradient(90deg, transparent, #ff0000, transparent);"></div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                <![endif]-->
                                
                                <!-- NON OUTLOOK -->
                                <!--[if !mso]><!-->
                                <div class="header-image-container">
                                    <img
                                        src="https://rp-web-site.pages.dev/email_header.png"
                                        alt=""
                                        class="header-image"
                                        style="display: block; width: 100%; height: auto; max-width: 600px;"
                                        onerror="this.style.display='none'; this.parentNode.querySelector('.header-fallback').style.display='block';"
                                    />
                                    
                                    <!-- Enhanced fallback for failed image loads -->
                                    <div class="header-fallback">
                                        <div class="header-fallback-inner">
                                            <div class="year-badge">2025 PRESENTS</div>
                                            <div class="header-title">
                                                REFLECTIONS<span class="title-separator">|</span>PROJECTIONS
                                            </div>
                                            <div class="header-decoration"></div>
                                        </div>
                                    </div>
                                </div>
                                <!--<![endif]-->
                                
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

                        <tr>
                            <td class="header-bottom-border"></td>
                        </tr>

                        <!-- CONTENT -->
                        <tr>
                            <td>
                                <table
                                    class="content-table"
                                    cellpadding="0"
                                    cellspacing="0"
                                    border="0"
                                >
                                    <tr>
                                        <td class="content-area">
                                            <p class="welcome-text">
                                                Thank you for registering for
                                                R|P 2025. We have received your
                                                information and will be sending
                                                next steps shortly.
                                            </p>

                                            <table
                                                width="100%"
                                                cellpadding="0"
                                                cellspacing="0"
                                                border="0"
                                            >
                                                <tr>
                                                    <td
                                                        class="accent-line"
                                                    ></td>
                                                </tr>
                                            </table>

                                            <table
                                                class="update-table"
                                                cellpadding="0"
                                                cellspacing="0"
                                                border="0"
                                            >
                                                <tr>
                                                    <td class="update-box">
                                                        Need to update your
                                                        registration?
                                                        <a
                                                            href="${Config.WEB_REGISTER_ROUTE}"
                                                            class="update-link"
                                                            >Return to the
                                                            registration form</a>
                                                        to edit your responses!
                                                    </td>
                                                </tr>
                                            </table>

                                            <h2 class="section-title">
                                                Registration Details
                                            </h2>

                                            <table
                                                class="info-table"
                                                cellpadding="0"
                                                cellspacing="0"
                                                border="0"
                                            >
                                                <tr>
                                                    <td class="info-bg">
                                                        <table
                                                            width="100%"
                                                            cellpadding="0"
                                                            cellspacing="0"
                                                            border="0"
                                                        >
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Name:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{name}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    School:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{school}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Education
                                                                    Level:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{educationLevel}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Graduation
                                                                    Year:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{graduationYear}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Majors:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{majors}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Minors:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{minors}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Dietary
                                                                    Restrictions:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{dietaryRestrictions}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Allergies:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{allergies}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Gender:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{gender}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Race/Ethnicity:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{ethnicity}}
                                                                </td>
                                                            </tr>
                                                            {{#personalLinks.length}}
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Personal
                                                                    Links:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                {{#personalLinks}}
                                                                    <a href="{{.}}" class="nested-link">{{.}}</a><br />
                                                                {{/personalLinks}}
                                                                </td>
                                                            </tr>
                                                            {{/personalLinks.length}}
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Interested
                                                                    in
                                                                    MechMania:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{#isInterestedMechMania}}Yes{{/isInterestedMechMania}}
                                                                    {{^isInterestedMechMania}}No{{/isInterestedMechMania}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Interested
                                                                    in
                                                                    PuzzleBang:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{#isInterestedPuzzleBang}}Yes{{/isInterestedPuzzleBang}}
                                                                    {{^isInterestedPuzzleBang}}No{{/isInterestedPuzzleBang}}
                                                                </td>
                                                            </tr>
                                                            <tr
                                                                class="info-row"
                                                            >
                                                                <td
                                                                    class="info-label"
                                                                >
                                                                    Interest
                                                                    Tags:
                                                                </td>
                                                                <td
                                                                    class="info-value"
                                                                >
                                                                    {{tags}}
                                                                    </td>
                                                           </tr>
                                                           <tr
                                                               class="info-row"
                                                           >
                                                               <td
                                                                   class="info-label"
                                                               >
                                                                   Opportunities
                                                                   Interest:
                                                               </td>
                                                               <td
                                                                   class="info-value"
                                                               >
                                                                   {{opportunities}}
                                                               </td>
                                                           </tr>
                                                           {{#hasResume}}
                                                           <tr
                                                               class="info-row"
                                                           >
                                                               <td
                                                                   class="info-label"
                                                               >
                                                                   Resume:
                                                               </td>
                                                               <td
                                                                   class="info-value"
                                                               >
                                                                   <table
                                                                       class="resume-table"
                                                                       cellpadding="0"
                                                                       cellspacing="0"
                                                                       border="0"
                                                                   >
                                                                       <tr>
                                                                           <td>
                                                                               <a
                                                                                   href="${Config.WEB_RESUME_ROUTE}"
                                                                                   class="resume-button"
                                                                                   >View
                                                                                   Your
                                                                                   Resume</a
                                                                               >
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
                           <td class="footer-top-border"></td>
                       </tr>

                       <tr>
                           <td>
                               <table
                                   class="footer-table"
                                   cellpadding="0"
                                   cellspacing="0"
                                   border="0"
                               >
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
