import draftsSubRouter from "./drafts/drafts-subrouter";
import listsSubRouter from "./lists/lists-subrouter";
import templatesSubRouter from "./templates/templates-subrouter";

import { Router } from "express";

const mailRouter = Router();

mailRouter.use("/drafts", draftsSubRouter);
mailRouter.use("/lists", listsSubRouter);
mailRouter.use("/templates", templatesSubRouter);

export default mailRouter;
