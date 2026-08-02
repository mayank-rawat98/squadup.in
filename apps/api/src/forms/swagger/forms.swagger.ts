import {
  ApiBodyOptions,
  ApiOperationOptions,
  ApiParamOptions,
  ApiQueryOptions,
  ApiResponseOptions,
} from '@nestjs/swagger';
import {
  CreateCareerFormDto,
  QueryCareerForm,
} from '../dto/create-career-form.dto';
import {
  CreateContactUsFormDto,
  QueryContactUsFormDto,
} from '../dto/create-contactus-form.dto';
import {
  CreateGrievanceFormDto,
  QueryGrievanceFormDto,
} from '../dto/create-grievance-form.dto';
import {
  CreateNewsletterFormDto,
  QueryNewsletterFormDto,
} from '../dto/create-newsletter-form.dto';
import {
  UpdateCareerForm,
  UpdateContactUsForm,
  UpdateGrievanceFormDto,
} from '../dto/update-forms.dto';
import { CareerStatus } from '../entities/career.entity';
import { ContactStatus, InquiryType } from '../entities/contactUs.entity';
import {
  GrievancePriority,
  GrievanceStatus,
  GrievanceType,
} from '../entities/grievance.entity';

// Common Responses
export const formCreatedResponse: ApiResponseOptions = {
  status: 201,
  description: 'The form was submitted successfully.',
  schema: {
    example: {
      success: true,
      data: null,
      message: 'Form created successfully',
    },
  },
};

export const formUpdatedResponse: ApiResponseOptions = {
  status: 200,
  description: 'The form was updated successfully.',
  schema: {
    example: {
      success: true,
      data: null,
      message: 'Form updated successfully',
    },
  },
};

export const forbiddenResponse: ApiResponseOptions = {
  status: 403,
  description: 'Forbidden. A staff token is required for management routes.',
};

export const notFoundResponse: ApiResponseOptions = {
  status: 404,
  description: 'Resource not found.',
};

// Common Queries
export const limitQuery: ApiQueryOptions = {
  name: 'limit',
  type: Number,
  required: false,
  example: 10,
};
export const pageQuery: ApiQueryOptions = {
  name: 'page',
  type: Number,
  required: false,
  example: 1,
};
export const sortQuery: ApiQueryOptions = {
  name: 'sort',
  enum: ['asc', 'desc'],
  required: false,
};
export const sortByQuery: ApiQueryOptions = {
  name: 'sortby',
  type: String,
  required: false,
};

// --- Contact Us ---

export const createContactUsOperation: ApiOperationOptions = {
  summary: 'Submit a new Contact Us form',
  description: 'Public endpoint for users to send inquiries.',
};

export const createContactUsBody: ApiBodyOptions = {
  type: CreateContactUsFormDto,
  examples: {
    requiredOnly: {
      summary: 'Minimal Request',
      value: {
        firstName: 'User',
        lastName: 'Test',
        email: 'user@example.com',
        message: 'This is a test message.',
      } as CreateContactUsFormDto,
    },
    full: {
      summary: 'Complete Request',
      value: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        inquiryType: InquiryType.SALES,
        message: 'I would like to inquire about your enterprise pricing.',
        company: 'Example Corp',
      } as CreateContactUsFormDto,
    },
  },
};

export const getAllContactUsOperation: ApiOperationOptions = {
  summary: 'Get all Contact Us forms (Admin)',
  description:
    'Protected endpoint to retrieve all submitted Contact Us forms with optional filtering and pagination.',
  security: [{ 'JWT-auth': [] }],
};

export const getAllContactUsStatusQuery: ApiQueryOptions = {
  name: 'status',
  enum: ContactStatus,
  required: false,
  description: 'Filter by submission status.',
};

export const getAllContactUsTypeQuery: ApiQueryOptions = {
  name: 'inquiryType',
  enum: InquiryType,
  required: false,
  description: 'Filter by inquiry type.',
};

export const getAllContactUsResponse: ApiResponseOptions = {
  status: 200,
  description: 'A paginated list of Contact Us forms.',
  type: QueryContactUsFormDto,
};

export const getContactUsByIdOperation: ApiOperationOptions = {
  summary: 'Get a single Contact Us form by Ticket ID (Admin)',
  security: [{ 'JWT-auth': [] }],
};

export const getContactUsByIdParam: ApiParamOptions = {
  name: 'ticketId',
  description: 'The unique Ticket ID of the Contact Us form.',
  type: String,
  example: 'CTC-L3X2A-F4E1C9B3D7A2E1B5C6',
};

export const getContactUsByIdResponse: ApiResponseOptions = {
  status: 200,
  description: 'The Contact Us form object.',
};

export const updateContactUsOperation: ApiOperationOptions = {
  summary: 'Update a Contact Us form (Admin)',
  description:
    'Protected endpoint to update the status, assignment, or summary of a Contact Us form.',
  security: [{ 'JWT-auth': [] }],
};

export const updateContactUsParam: ApiParamOptions = {
  name: 'ticketId',
  description: 'The unique Ticket ID of the form to update.',
  type: String,
};

export const updateContactUsBody: ApiBodyOptions = {
  type: UpdateContactUsForm,
};

// --- Grievance ---

export const createGrievanceOperation: ApiOperationOptions = {
  summary: 'Submit a new Grievance form',
  description: 'Public endpoint for users to submit grievances.',
};

export const createGrievanceBody: ApiBodyOptions = {
  type: CreateGrievanceFormDto,
  examples: {
    privacyIssue: {
      summary: 'Privacy Grievance',
      value: {
        subject: 'Data Deletion Request',
        description: 'Please delete all my data from your systems.',
        fullName: 'Jane Doe',
        email: 'jane.doe@example.com',
        grievanceType: GrievanceType.PRIVACY,
      } as CreateGrievanceFormDto,
    },
  },
};

export const getAllGrievanceOperation: ApiOperationOptions = {
  summary: 'Get all Grievance forms (Admin)',
  description:
    'Protected endpoint to retrieve all submitted Grievance forms with optional filtering and pagination.',
  security: [{ 'JWT-auth': [] }],
};

export const getAllGrievanceStatusQuery: ApiQueryOptions = {
  name: 'status',
  enum: GrievanceStatus,
  required: false,
  description: 'Filter by submission status.',
};

export const getAllGrievancePriorityQuery: ApiQueryOptions = {
  name: 'priority',
  enum: GrievancePriority,
  required: false,
  description: 'Filter by grievance priority.',
};

export const getAllGrievanceTypeQuery: ApiQueryOptions = {
  name: 'grievanceType',
  enum: GrievanceType,
  required: false,
  description: 'Filter by grievance type.',
};

export const getAllGrievanceResponse: ApiResponseOptions = {
  status: 200,
  description: 'A paginated list of Grievance forms.',
  type: QueryGrievanceFormDto,
};

export const getGrievanceByIdOperation: ApiOperationOptions = {
  summary: 'Get a single Grievance form by Ticket ID (Admin)',
  security: [{ 'JWT-auth': [] }],
};

export const getGrievanceByIdParam: ApiParamOptions = {
  name: 'ticketId',
  description: 'The unique Ticket ID of the Grievance form.',
  type: String,
  example: 'GRV-L3X2A-F4E1C9B3D7A2E1B5C6',
};

export const getGrievanceByIdResponse: ApiResponseOptions = {
  status: 200,
  description: 'The Grievance form object.',
};

export const updateGrievanceOperation: ApiOperationOptions = {
  summary: 'Update a Grievance form (Admin)',
  description:
    'Protected endpoint to update the status, priority, assignment, or summary of a Grievance form.',
  security: [{ 'JWT-auth': [] }],
};

export const updateGrievanceParam: ApiParamOptions = {
  name: 'ticketId',
  description: 'The unique Ticket ID of the form to update.',
  type: String,
};

export const updateGrievanceBody: ApiBodyOptions = {
  type: UpdateGrievanceFormDto,
};

// --- Career ---

export const createCareerOperation: ApiOperationOptions = {
  summary: 'Submit a new Career application form',
  description: 'Public endpoint for users to apply for a career.',
};

export const createCareerBody: ApiBodyOptions = {
  type: CreateCareerFormDto,
  examples: {
    softwareEngineer: {
      summary: 'Software Engineer Application',
      value: {
        fullName: 'Alex Smith',
        email: 'alex.smith@example.com',
        description: 'I am a software engineer with 5 years of experience.',
        socialLinks: 'linkedin.com/in/alexsmith',
      } as CreateCareerFormDto,
    },
  },
};

export const getAllCareerOperation: ApiOperationOptions = {
  summary: 'Get all Career forms (Admin)',
  description:
    'Protected endpoint to retrieve all submitted Career forms with optional filtering and pagination.',
  security: [{ 'JWT-auth': [] }],
};

export const getAllCareerStatusQuery: ApiQueryOptions = {
  name: 'status',
  enum: CareerStatus,
  required: false,
  description: 'Filter by application status.',
};

export const getAllCareerResponse: ApiResponseOptions = {
  status: 200,
  description: 'A paginated list of Career forms.',
  type: QueryCareerForm,
};

export const getCareerByIdOperation: ApiOperationOptions = {
  summary: 'Get a single Career form by Ticket ID (Admin)',
  security: [{ 'JWT-auth': [] }],
};

export const getCareerByIdParam: ApiParamOptions = {
  name: 'ticketId',
  description: 'The unique Ticket ID of the Career form.',
  type: String,
  example: 'CR-L3X2A-F4E1C9B3D7A2E1B5C6',
};

export const getCareerByIdResponse: ApiResponseOptions = {
  status: 200,
  description: 'The Career form object.',
};

export const updateCareerOperation: ApiOperationOptions = {
  summary: 'Update a Career form (Admin)',
  description:
    'Protected endpoint to update the status, assignment, or summary of a Career form.',
  security: [{ 'JWT-auth': [] }],
};

export const updateCareerParam: ApiParamOptions = {
  name: 'ticketId',
  description: 'The unique Ticket ID of the form to update.',
  type: String,
};

export const updateCareerBody: ApiBodyOptions = { type: UpdateCareerForm };

// --- Newsletter ---

export const createNewsletterOperation: ApiOperationOptions = {
  summary: 'Subscribe to the newsletter',
  description: 'Public endpoint for users to subscribe to the newsletter.',
};

export const createNewsletterBody: ApiBodyOptions = {
  type: CreateNewsletterFormDto,
  examples: {
    basic: {
      summary: 'Basic Subscription',
      value: {
        email: 'subscriber@example.com',
      } as CreateNewsletterFormDto,
    },
    detailed: {
      summary: 'Subscription with Details',
      value: {
        email: 'poweruser@example.com',
        name: 'Power User',
        source: 'Website Footer',
        consentGiven: true,
        tags: ['tech_enthusiast', 'early_adopter'],
      } as CreateNewsletterFormDto,
    },
  },
};

export const unsubscribeNewsletterOperation: ApiOperationOptions = {
  summary: 'Unsubscribe from the newsletter',
  description:
    'Public endpoint for a user to unsubscribe using their unique token.',
};

export const unsubscribeNewsletterBody: ApiBodyOptions = {
  schema: {
    type: 'object',
    properties: {
      token: { type: 'string', example: 'unique-unsubscribe-token' },
    },
    required: ['token'],
  },
};

export const unsubscribeNewsletterResponse: ApiResponseOptions = {
  status: 200,
  description: 'Successfully unsubscribed.',
};

export const getAllNewsletterOperation: ApiOperationOptions = {
  summary: 'Get all Newsletter subscriptions (Admin)',
  description:
    'Protected endpoint to retrieve all newsletter subscriptions with optional filtering and pagination.',
  security: [{ 'JWT-auth': [] }],
};

export const getAllNewsletterSubscribedQuery: ApiQueryOptions = {
  name: 'subscribed',
  type: Boolean,
  required: false,
  description: 'Filter by subscription status.',
};

export const getAllNewsletterResponse: ApiResponseOptions = {
  status: 200,
  description: 'A paginated list of Newsletter subscriptions.',
  type: QueryNewsletterFormDto,
};

export const getNewsletterByIdOperation: ApiOperationOptions = {
  summary: 'Get a single Newsletter subscription by ID (Admin)',
  security: [{ 'JWT-auth': [] }],
};

export const getNewsletterByIdParam: ApiParamOptions = {
  name: 'id',
  description: 'The UUID of the Newsletter subscription.',
  type: String,
};

export const getNewsletterByIdResponse: ApiResponseOptions = {
  status: 200,
  description: 'The Newsletter subscription object.',
};
