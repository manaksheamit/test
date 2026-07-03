/**
 * Component: aehcPublicationCreationWizard
 * Author: Umang Rohitbhai Fofariya
 * Date: 24-May-2026
 *
 * Description:
 * Handles multi-step publication creation flow including submission
 * and redirect to publication detail page.
 */

import { LightningElement, track } from 'lwc';
import createPublication from '@salesforce/apex/AEHC_PublicationController.createPublication';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import L_CREATE from '@salesforce/label/c.AEHC_DP_Create_Publication';
import L_SUCCESS from '@salesforce/label/c.AEHC_DP_Success_Message';
import L_ERR_TITLE from '@salesforce/label/c.AEHC_DP_Error_Title';
import L_ERR_CREATE from '@salesforce/label/c.AEHC_DP_Error_Create_Publication';
import logError from '@salesforce/apex/AEHC_Logger.logError';
import LABEL_ENV_NAME from '@salesforce/label/c.AEHC_Environment_Name';
import basePath from '@salesforce/community/basePath';

export default class AehcPublicationCreationWizard extends LightningElement {

    currentStep = '1';
    isReturningToStepOne = false;
    @track wizardData = {
        application: {},
        metadata: {},
        schema: {},
        schedule: {}
    };
    labels = {
        createPublication: L_CREATE,
        success: L_SUCCESS,
        errorTitle: L_ERR_TITLE,
        errorCreate: L_ERR_CREATE
    };

    isSubmitSuccess = false;
    submittedPublicationRecordId;
    submittedPublicationId;
    submittedPublicationName;
    isSubmitting = false;

    /* -------- STEP CONTROL -------- */

    get isStepOne() { return this.currentStep === '1'; }
    get isStepThree() { return this.currentStep === '3'; }
    get isStepFour() { return this.currentStep === '4'; }
    goToStepFour() { this.currentStep = '4'; }
    goToStepOne() { this.currentStep = '1'; }
    goToStepThree() { this.currentStep = '3'; }
    
    goToPreviousStep(event) {
        const fromStep = event?.detail?.fromStep || '3';
        if (fromStep === '4') {
            this.currentStep = '3';
        } else if (fromStep === '3') {
            this.isReturningToStepOne = true;
            this.currentStep = '1';
        }
    }

    handleDataRestored(event) {
        // Reset the returning flag after data has been restored
        if (event.detail?.dataLoaded) {
            this.isReturningToStepOne = false;
        }
    }

    /* -------- DATA FLOW -------- */

    handleStepDataChange(event) {
        const data = event.detail;

        this.wizardData = {
            ...this.wizardData,
            application: data.application || this.wizardData.application,
            metadata: data.metadata
                ? { ...this.wizardData.metadata, ...data.metadata }
                : this.wizardData.metadata,
            schema: data.schema
                ? { ...this.wizardData.schema, ...data.schema }
                : this.wizardData.schema,
            schedule: data.schedule
                ? { ...this.wizardData.schedule, ...data.schedule }
                : this.wizardData.schedule
        };
    }

    get finalData() {
        return this.wizardData;
    }

    get submittedPublicationUrl() {
        return this.submittedPublicationRecordId
            ? `${basePath}/data-publication-details?id=${this.submittedPublicationRecordId}`
            : '#';
    }

    /* -------- SUBMIT -------- */

    async handleSubmit() {
        this.isSubmitting = true;

        try {
            const result = await createPublication({
                requestJson: JSON.stringify(this.finalData)
            });

            if (!result) {
                throw new Error('Empty response from server');
            }

            this.submittedPublicationRecordId = result.publicationRecordId;
            this.submittedPublicationId = result.publicationId;
            this.submittedPublicationName = result.publicationName;
        
            // MOVE TO SUCCESS STEP
            this.currentStep = '4';
            this.isSubmitSuccess = true;

        } catch (e) {
            this.logException(e, 'handleSubmit');

            this.showToast(
                this.labels.errorTitle,
                e?.body?.message || e?.message || this.labels.errorCreate,
                'error'
            );

        } finally {
            this.isSubmitting = false;
        }
    }
    logException(error, operation) {
        try {
            logError({
                message: error?.message || 'Error',
                componentType: 'LWC',
                componentName: 'aehcPublicationCreationWizard',
                operation,
                recordId: null,
                severity: 'High',
                category: 'UI',
                transactionContext: JSON.stringify(this.wizardData),
                orgEnv: LABEL_ENV_NAME
            }).catch(() => { });
        } catch (e) { }
    }
}