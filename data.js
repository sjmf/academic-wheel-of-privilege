/* Academic Wheel of Privilege Visualisation Source Data */
/* Licence: CC-BY-NC-4.0 per FORRT AWOP license */

// Data for all 20 identity types
const identityData = {
    // Category: Living and Culture
    "Skin Color": {
        category: "Living and Culture",
        spectrum: { outer: "Dark", middle: "Various shades", inner: "White" },
        description: "Skin color affects how individuals are perceived and treated in academic and social settings. Lighter skin tones are often associated with greater privilege in Western academic contexts.",
        ukLaw: {
            status: "protected",
            title: "Protected Characteristic",
            text: "Race, including skin color, is a protected characteristic under the Equality Act 2010. Discrimination based on skin color is unlawful in employment, education, and services."
        }
    },
    "Religion and Culture": {
        category: "Living and Culture",
        spectrum: { outer: "Not widely accepted", middle: "Usually accepted", inner: "Widely accepted" },
        description: "Religious and cultural backgrounds influence access to academic networks, understanding of hidden curricula, and ability to participate fully in academic life.",
        ukLaw: {
            status: "protected",
            title: "Protected Characteristic",
            text: "Religion or belief is a protected characteristic under the Equality Act 2010. This includes religious and philosophical beliefs, as well as lack of belief."
        }
    },
    "Citizenship": {
        category: "Living and Culture",
        spectrum: { outer: "Undocumented", middle: "Documented", inner: "Citizen" },
        description: "Citizenship status affects access to funding, employment opportunities, and the ability to participate freely in academic activities without visa restrictions.",
        ukLaw: {
            status: "partial",
            title: "Partial Protection",
            text: "While nationality can be related to the protected characteristic of race, immigration status itself is not directly protected. However, indirect discrimination based on nationality may be unlawful."
        }
    },
    "Language": {
        category: "Living and Culture",
        spectrum: { outer: "Non-English monolingual", middle: "Learned English", inner: "Native English" },
        description: "English language proficiency significantly impacts academic success, publication opportunities, and networking in predominantly Anglophone academic environments.",
        ukLaw: {
            status: "partial",
            title: "Indirect Protection",
            text: "Language is not a protected characteristic, but discrimination based on language may constitute indirect race discrimination if it disproportionately affects certain ethnic groups."
        }
    },

    // Category: Caregiving
    "Caring Duties": {
        category: "Caregiving",
        spectrum: { outer: "Sole carer", middle: "Shared care", inner: "No care duties" },
        description: "Caring responsibilities for children, elderly relatives, or others significantly impact time available for research, networking, and career advancement.",
        ukLaw: {
            status: "partial",
            title: "Indirect Protection",
            text: "While caring duties aren't directly protected, discrimination against carers may constitute indirect sex discrimination (as women disproportionately bear caring responsibilities) under the Equality Act 2010."
        }
    },

    // Category: Education and Career
    "Caregiver Educational Level": {
        category: "Education and Career",
        spectrum: { outer: "Primary/Secondary", middle: "Tertiary", inner: "Advanced degrees" },
        description: "Parents' or caregivers' educational background influences cultural capital, understanding of academic systems, and access to guidance and networks.",
        ukLaw: {
            status: "not-protected",
            title: "Not Directly Protected",
            text: "Parental education level is not a protected characteristic. However, it relates to socioeconomic background, which the Equality Act 2010 does not directly cover."
        }
    },
    "Formal Education": {
        category: "Education and Career",
        spectrum: { outer: "None", middle: "Limited", inner: "Degree(s)" },
        description: "Level of formal education affects access to academic positions, credibility in scholarly discussions, and ability to navigate academic institutions.",
        ukLaw: {
            status: "not-protected",
            title: "Not Directly Protected",
            text: "Educational qualifications are not a protected characteristic. Requiring qualifications is generally lawful if justified for the role."
        }
    },
    "Funding/Resources": {
        category: "Education and Career",
        spectrum: { outer: "None/Very low", middle: "Medium", inner: "High" },
        description: "Access to research funding and institutional resources determines capacity to conduct research, attend conferences, and publish in prestigious venues.",
        ukLaw: {
            status: "not-protected",
            title: "Not Directly Protected",
            text: "Access to funding is not a protected characteristic, though funding disparities may intersect with protected characteristics like race or disability."
        }
    },
    "Career Stage": {
        category: "Education and Career",
        spectrum: { outer: "Early career", middle: "Mid-career", inner: "Late career/Tenured" },
        description: "Career stage affects job security, influence in academic decisions, and access to resources and networks that support career advancement.",
        ukLaw: {
            status: "protected",
            title: "Related to Age Protection",
            text: "Age is a protected characteristic under the Equality Act 2010. Career stage discrimination may constitute age discrimination if it disproportionately affects certain age groups."
        }
    },
    "Institution": {
        category: "Education and Career",
        spectrum: { outer: "Teaching intensive", middle: "Equal teaching/research", inner: "Research intensive" },
        description: "Type of institution affects time for research, access to funding, prestige, and career progression opportunities in academia.",
        ukLaw: {
            status: "not-protected",
            title: "Not Directly Protected",
            text: "Institutional type is not a protected characteristic. However, institutional prestige hierarchies may reinforce existing inequalities."
        }
    },

    // Category: Gender and Sexuality
    "Gender": {
        category: "Gender and Sexuality",
        spectrum: { outer: "Trans/Non-binary/Intersex", middle: "Cis woman", inner: "Cis man" },
        description: "Gender identity and expression affect experiences of discrimination, access to opportunities, and representation in academic leadership positions.",
        ukLaw: {
            status: "protected",
            title: "Protected Characteristics",
            text: "Sex and gender reassignment are protected characteristics under the Equality Act 2010. This protects against discrimination based on being male, female, or undergoing gender transition."
        }
    },
    "Sexuality": {
        category: "Gender and Sexuality",
        spectrum: { outer: "Lesbian/Bi/Pan/Asexual", middle: "Gay man", inner: "Heterosexual" },
        description: "Sexual orientation influences experiences of inclusion or exclusion in academic environments and can affect career progression and wellbeing.",
        ukLaw: {
            status: "protected",
            title: "Protected Characteristic",
            text: "Sexual orientation is a protected characteristic under the Equality Act 2010. Discrimination based on being lesbian, gay, bisexual, or heterosexual is unlawful."
        }
    },

    // Category: Race
    "Current Wealth": {
        category: "Socioeconomic",
        spectrum: { outer: "Poor", middle: "Middle class", inner: "Rich" },
        description: "Current wealth affects ability to access education, take unpaid opportunities, relocate for positions, and weather periods of job insecurity.",
        ukLaw: {
            status: "not-protected",
            title: "Not Directly Protected",
            text: "Socioeconomic status is not a protected characteristic under the Equality Act 2010, though the Public Sector Equality Duty includes consideration of socioeconomic disadvantage in some contexts."
        }
    },
    "Housing": {
        category: "Socioeconomic",
        spectrum: { outer: "Homeless", middle: "Renting", inner: "Owns property" },
        description: "Housing stability affects ability to focus on academic work, access to quiet study spaces, and financial security needed for career risk-taking.",
        ukLaw: {
            status: "not-protected",
            title: "Not Directly Protected",
            text: "Housing status is not a protected characteristic. However, housing discrimination may intersect with protected characteristics like race or disability."
        }
    },

    // Category: Health and Wellbeing
    "Neurodiversity": {
        category: "Health and Wellbeing",
        spectrum: { outer: "Multiply neurodivergent", middle: "Some neurodivergence", inner: "Neurotypical" },
        description: "Neurodivergent individuals (autism, ADHD, dyslexia, etc.) face unique challenges in academic environments designed for neurotypical people, including sensory issues and executive function demands.",
        ukLaw: {
            status: "protected",
            title: "Protected Under Disability",
            text: "Neurodevelopmental conditions that have a substantial and long-term adverse effect on ability to carry out normal day-to-day activities are protected as disabilities under the Equality Act 2010."
        }
    },
    "Mental Health": {
        category: "Health and Wellbeing",
        spectrum: { outer: "Vulnerable", middle: "Mostly stable", inner: "Robust" },
        description: "Mental health affects capacity to manage academic pressures, maintain productivity, and navigate competitive and often stressful academic environments.",
        ukLaw: {
            status: "protected",
            title: "Protected Under Disability",
            text: "Mental health conditions that have a substantial and long-term adverse effect on day-to-day activities are protected as disabilities under the Equality Act 2010."
        }
    },
    "Disability": {
        category: "Health and Wellbeing",
        spectrum: { outer: "Multiply disabled", middle: "Some disability", inner: "Able-bodied" },
        description: "Physical disabilities affect access to academic spaces, travel for conferences, and ability to perform certain research tasks without accommodations.",
        ukLaw: {
            status: "protected",
            title: "Protected Characteristic",
            text: "Disability is a protected characteristic under the Equality Act 2010. Employers and institutions have a duty to make reasonable adjustments for disabled individuals."
        }
    },
    "Body Size": {
        category: "Health and Wellbeing",
        spectrum: { outer: "Large", middle: "Average", inner: "Slim" },
        description: "Body size affects how individuals are perceived professionally, can influence hiring decisions, and impacts experiences of belonging in academic settings.",
        ukLaw: {
            status: "not-protected",
            title: "Not Directly Protected",
            text: "Body size or weight is not a protected characteristic under the Equality Act 2010. However, obesity may be considered a disability in some cases if it meets the legal definition."
        }
    },

    // Category: Childhood and Development
    "Childhood Household Wealth": {
        category: "Childhood and Development",
        spectrum: { outer: "Poor", middle: "Middle class", inner: "Rich" },
        description: "Childhood socioeconomic status affects educational opportunities, cultural capital, and networks that influence later academic success.",
        ukLaw: {
            status: "not-protected",
            title: "Not Directly Protected",
            text: "Childhood socioeconomic background is not a protected characteristic, though it significantly influences life outcomes and intersects with protected characteristics."
        }
    },
    "Childhood Household Stability": {
        category: "Childhood and Development",
        spectrum: { outer: "Unstable", middle: "Mostly stable", inner: "Stable" },
        description: "Childhood stability affects attachment, mental health, and ability to develop skills and networks that support academic success.",
        ukLaw: {
            status: "not-protected",
            title: "Not Directly Protected",
            text: "Childhood experiences are not protected characteristics, though adverse childhood experiences may result in conditions that are protected as disabilities."
        }
    }
};

// Category colors, positions, and descriptions
// Colors based on original Wheel of Privilege diagram
const categories = {
    "Living and Culture": {
        angle: 0,
        description: "Factors related to cultural background, identity, and lived experience in society."
    },
    "Caregiving": {
        angle: 51.4,
        description: "Responsibilities for caring for others that can impact time and energy available for academic work."
    },
    "Education and Career": {
        angle: 102.8,
        description: "Formal educational background, career stage, and access to academic resources and networks."
    },
    "Gender and Sexuality": {
        angle: 154.2,
        description: "Gender identity and sexual orientation, which affect representation and experiences in academia."
    },
    "Socioeconomic": {
        angle: 205.6,
        description: "Current financial status and access to material resources that enable academic participation."
    },
    "Health and Wellbeing": {
        angle: 257,
        description: "Physical and mental health factors that affect ability to participate fully in academic life."
    },
    "Childhood and Development": {
        angle: 308.4,
        description: "Early life experiences that shape educational opportunities and cultural capital."
    }
};
