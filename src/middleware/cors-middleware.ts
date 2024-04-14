import cors from "cors";

// Allow CORS for Netlify deploy previews
const allowedOrigins = ["https://reflectionsprojections.org"];
// Function to check if the origin matches the deploy preview format
function isNetlifyDeployPreview(origin: string) {
    const regex = new RegExp("deploy-preview-[0-9]*(--rp2024.netlify.app)(.*)");
    return regex.test(origin);
}

const corsMiddleware = cors({
    origin: function (origin, callback) {
        if (
            !origin ||
            allowedOrigins.includes(origin) ||
            isNetlifyDeployPreview(origin)
        ) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
});

export default corsMiddleware;
