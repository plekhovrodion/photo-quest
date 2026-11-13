/// <reference types="react" />
interface IFeedbackConfig {
    baseUrl?: string;
    apiVersion: number;
    projectName: string;
    formName: string;
}
interface IFeedbackProps {
    config: IFeedbackConfig;
    visible: boolean;
    zIndex?: number;
    className: string;
    onClose: () => void;
    onCloseAnimationComplete?: () => void;
}
declare const Feedback: ({ config: { baseUrl, apiVersion, projectName, formName }, visible, zIndex, className, onClose, onCloseAnimationComplete }: IFeedbackProps) => JSX.Element;
export { Feedback as default };
//# sourceMappingURL=index.esm.d.ts.map