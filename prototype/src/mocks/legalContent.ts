/**
 * 약관·개인정보처리방침 — 실제 본문 (2026-07-17 접수).
 * 로그인 밖(대문)과 포털 푸터에서 열람 가능.
 */

export interface LegalSection {
  /** 번호 배지 (01, 02…) — 없으면 소제목 카드형 */
  no?: string;
  title: string;
  /** 문단 (줄바꿈 \n 지원) */
  body?: string;
  /** 불릿 목록 — [굵은 용어, 설명] */
  bullets?: Array<[string, string]>;
  /** 라벨:값 표 (회사 정보 등) */
  table?: Array<[string, string]>;
}

export interface LegalDoc {
  id: 'agreement' | 'privacy';
  title: string;
  company: string;
  sections: LegalSection[];
  footnote: string;
}

const COMPANY_TABLE: Array<[string, string]> = [
  ['Company Name', 'OHMYHOTEL GLOBAL PTE. LTD.'],
  ['Representative', 'LEE MISOON'],
  ['Business Reg. No.', '202543984E'],
  ['Address', '111 SOMERSET ROAD, #06-01H, 111 SOMERSET, SINGAPORE 238164'],
];

const KR_ENTRUST_TABLE: Array<[string, string]> = [
  ['Company Name', 'OHMYHOTEL & CO., LTD.'],
  ['Representative', 'Lee Misoon'],
  ['Business Reg. No.', '105-87-71311'],
  ['Address', 'GT Dongdaemun Building 6F, 328 Jongno (Changsin-dong 330-1), Jongno-gu, Seoul, Korea'],
  ['Tel', '+82-2-762-0552 (Korea weekdays 09:00~18:00, excluding weekends/holidays)'],
  ['PI Manager', 'Choi Younggeun'],
  ['Mail-order Reg. No.', '2020-Seoul Jongno-0399'],
];

export const LEGAL_DOCS: Record<'agreement' | 'privacy', LegalDoc> = {
  agreement: {
    id: 'agreement',
    title: 'Terms & Condition',
    company: 'OHMYHOTEL GLOBAL PTE. LTD.',
    sections: [
      {
        no: '01',
        title: 'Purpose',
        body:
          'These Terms of Use are intended to prescribe the rights, obligations, and responsibilities of the Company and users in using internet-related services (hereinafter referred to as "Services") provided by OHMYHOTEL GLOBAL PTE. LTD. (hereinafter referred to as the "Company") through the online shopping mall Partners OHMYHOTEL & CO. (https://partner.ohmyhotel.com) (hereinafter referred to as "OHMYHOTEL & CO.").',
      },
      { title: 'Company Information', table: COMPANY_TABLE },
      {
        title: 'Customer Center Operation Entrustment',
        body: 'The Company entrusts the operation of the customer center and service fulfillment to the following Korean corporation.',
        table: KR_ENTRUST_TABLE,
      },
      {
        no: '02',
        title: 'Definitions',
        body:
          '① "OHMYHOTEL & CO." refers to the virtual business establishment set up by OHMYHOTEL & CO. to provide goods or services (hereinafter referred to as "Goods, etc.") to users through information and communication facilities such as computers, and is also used to mean the business operator operating the online shopping mall.\n② "User" refers to both members and non-members who access "OHMYHOTEL & CO." and receive services provided by "OHMYHOTEL & CO." in accordance with these Terms.\n③ "Member" refers to a person who has registered as a member by providing personal information to "OHMYHOTEL & CO.," continuously receives information from "OHMYHOTEL & CO.," and can continuously use the services provided by "OHMYHOTEL & CO."\n④ "Travel Product" refers to all intangible products including accommodation reservation and other travel-related ancillary service reservations provided by "OHMYHOTEL & CO."',
      },
      {
        no: '03',
        title: 'Specification, Explanation, and Revision of Terms, etc.',
        body:
          '① "OHMYHOTEL & CO." shall post the contents of these Terms and the trade name, representative\'s name, business location address (including the address where consumer complaints can be handled), phone number, fax number, email address, business registration number, mail-order business registration number, personal information manager, etc., in a manner easily accessible to users on the initial service screen (front page) of the online shopping mall; however, the contents of the Terms may be made available through a linked screen.\n② "OHMYHOTEL & CO." shall, prior to the user\'s agreement to the Terms, provide a separate linked screen or pop-up screen to obtain the user\'s confirmation regarding important contents specified in the Terms, such as subscription withdrawal and refund conditions, so that the user can understand them.\n③ "OHMYHOTEL & CO." may revise these Terms to the extent that they do not violate the Act on the Consumer Protection in Electronic Commerce, etc., the Act on the Regulation of Terms, the Framework Act on Electronic Transactions, the Electronic Signatures Act, the Act on Promotion of Information and Communications Network Utilization and Information Protection, etc., the Door-to-Door Sales Act, the Consumer Protection Act, and other relevant laws.\n④ When "OHMYHOTEL & CO." revises the Terms, it shall specify the effective date and the reasons for the revision and post it together with the current Terms on the initial screen of the online shopping mall from 7 days before the effective date until the day before the effective date. However, in the case of changes to the Terms that are disadvantageous to users, a prior grace period of at least 30 days shall be provided. In this case, "OHMYHOTEL & CO." shall clearly compare the contents before and after the revision for easy understanding by users.\n⑤ When "OHMYHOTEL & CO." revises the Terms, the revised Terms shall apply only to contracts concluded on or after the effective date, and the Terms before the revision shall continue to apply to contracts already concluded before the effective date. However, if a user who has already entered into a contract indicates their desire to be subject to the revised Terms within the notice period specified in Paragraph 3 by sending a notification to "OHMYHOTEL & CO." and obtains the consent of "OHMYHOTEL & CO.," the revised Terms shall apply.\n⑥ Matters not stipulated in these Terms and the interpretation of these Terms shall be governed by the Act on the Consumer Protection in Electronic Commerce, etc., the Act on the Regulation of Terms, the Guidelines for Consumer Protection in Electronic Commerce prescribed by the Fair Trade Commission, and other relevant laws or customs.',
      },
      {
        no: '04',
        title: 'Provision and Change of Services',
        body:
          '① "OHMYHOTEL & CO." shall perform the following tasks:\n1. Provision of information and reservation agency services for "Travel Products"\n2. Delivery of goods or services under a concluded purchase contract\n3. Other tasks determined by "OHMYHOTEL & CO."\n② "OHMYHOTEL & CO." receives detailed information for each accommodation from the relevant accommodation or professional suppliers in real-time and provides it for reference purposes; however, some inaccurate information may be included. Therefore, for matters requiring accurate information verification, please confirm through the OHMYHOTEL & CO. customer center before proceeding with reservations. OHMYHOTEL & CO. shall not be responsible for any damages arising from failure to verify such information.\n③ "OHMYHOTEL & CO." provides rates that include agency commission and value-added tax (VAT) and service charges based on wholesale prices contracted under the condition of selling to FIT (Free Independent Tourism) customers. However, when reserving 4 or more rooms at the same accommodation on the same date, it may be considered a group reservation, and separate rates and cancellation policies may apply instead of wholesale rates. In such cases, "OHMYHOTEL & CO." will notify the customer in accordance with Article 8, confirm whether to maintain the reservation, and process cancellation in accordance with Article 12 if the customer wishes to cancel.\n④ "OHMYHOTEL & CO." provides discounted rates based on the Wholesale FIT leisure category for local accommodations in European, American, or Asian business cities. While there is usually no inconvenience in usage, when making accommodation reservations for business purposes such as participation in major local conferences and exhibitions, rates from the business category rather than the leisure category may apply.\nFurthermore, for hotels designated for conference participation, hotel rates for conference participants are separately set by the hotel during the conference period. Even after a reservation has been completed at our OHMYHOTEL & CO. wholesale rate, customers who are listed as conference participants on the organizer (PCO) list may face rejection of our reservation or requests for additional charges from the hotel, and "OHMYHOTEL & CO." shall not be responsible for any resulting damages.\n⑤ OHMYHOTEL & CO.\'s rates are operated under a lowest price guarantee system and are based on wholesale prices. Accordingly, if the cost price between local suppliers directly settled at the hotel is disclosed due to the customer\'s price inquiry request or a hotel staff\'s mistake, the amount directly paid to the hotel shall be refunded, and the difference on the receipt shall not be refunded.\n⑥ "OHMYHOTEL & CO." may change the contents of "Travel Products" to be provided under future contracts in the event of a sold-out or change of "Travel Products." In such cases, the changed contents and the provision date shall be specified and immediately posted where the detailed contents of the relevant product are posted.\n⑦ If "OHMYHOTEL & CO." changes the contents of a "Travel Product" that it agreed to provide to the user under a contract due to sold-out or other changes, it shall notify the user by the method prescribed in Article 8 and compensate the user for damages. However, this shall not apply if "OHMYHOTEL & CO." proves the absence of intent or negligence.\n⑧ Since "Travel Products" are non-inventory items that cannot be resold after the same day, the relevant accommodation or professional supplier may independently conduct temporary discount sales to exhaust inventory depending on room sales status. If this results in a difference in payment amounts from existing reservations for the same accommodation, "OHMYHOTEL & CO." shall not compensate for the price difference.\n⑨ Even for identical paid services provided by the accommodation, there may be differences between the rates provided by "OHMYHOTEL & CO." and those provided by the accommodation itself, and "OHMYHOTEL & CO." shall not compensate for such differences.',
      },
      {
        no: '05',
        title: 'Suspension of Services',
        body:
          '① "OHMYHOTEL & CO." may temporarily suspend the provision of services in the event of maintenance, replacement, or malfunction of information and communication facilities such as computers, disruption of communications, or similar reasons.\n② In the case of service suspension pursuant to Paragraph 1, "OHMYHOTEL & CO." shall notify users by the method prescribed in Article 8.\n③ "OHMYHOTEL & CO." shall compensate users or third parties for damages incurred due to temporary suspension of services for the reasons stated in Paragraph 1. However, this shall not apply if "OHMYHOTEL & CO." proves the absence of intent or negligence.',
      },
      {
        no: '06',
        title: 'Membership Registration',
        body:
          '① Users shall apply for membership by filling in membership information according to the registration form prescribed by "OHMYHOTEL & CO." and expressing their intention to agree to these Terms.\n② "OHMYHOTEL & CO." shall register the user as a member unless the applicant falls under any of the following:\n1. Cases where the applicant has previously lost membership under Article 7, Paragraph 3 of these Terms; however, an exception shall be made for those who have obtained approval for re-registration from "OHMYHOTEL & CO." after 3 years have elapsed since the loss of membership under Article 7, Paragraph 3.\n2. Cases where the registration contains false information, omissions, or errors\n3. Cases where registration as a member is deemed to significantly hinder "OHMYHOTEL & CO." technically\n③ The membership contract shall be deemed established at the time when "OHMYHOTEL & CO.\'s" acceptance reaches the member.\n④ If there are changes to the registration information under Article 15, Paragraph 1, the member shall promptly notify "OHMYHOTEL & CO." of such changes by email or other means.',
      },
      {
        no: '07',
        title: 'Membership Withdrawal and Loss of Qualification, etc.',
        body:
          '① A member may request withdrawal from "OHMYHOTEL & CO." at any time, and "OHMYHOTEL & CO." shall promptly process the withdrawal.\n② If a member falls under any of the following reasons, "OHMYHOTEL & CO." may restrict and suspend membership:\n1. Cases of registering false information at the time of application\n2. Cases of failure to pay debts borne by the member, including the price of "Travel Products" reserved using "OHMYHOTEL & CO." and other obligations related to the use of "OHMYHOTEL & CO.," by the due date\n3. Cases of interfering with another person\'s use of "OHMYHOTEL & CO." or stealing such information, thereby threatening the order of electronic commerce\n4. Cases of using "OHMYHOTEL & CO." to engage in acts prohibited by laws or these Terms or acts contrary to public order and morals\n③ If the same conduct is repeated 2 or more times or the reason is not corrected within 30 days after "OHMYHOTEL & CO." has restricted or suspended membership, "OHMYHOTEL & CO." may revoke membership.\n④ When "OHMYHOTEL & CO." revokes membership, the membership registration shall be cancelled. In this case, the member shall be notified, and a minimum period of 30 days shall be granted to provide an opportunity for explanation before the membership registration is cancelled.',
      },
      {
        no: '08',
        title: 'Notification to Members',
        body:
          '① When "OHMYHOTEL & CO." sends notifications to a member, it may do so to the email address designated in advance by agreement between the member and "OHMYHOTEL & CO."\n② "OHMYHOTEL & CO." may substitute individual notifications by posting on the "OHMYHOTEL & CO." bulletin board for at least 1 week in the case of notifications to an unspecified number of members. However, individual notification shall be given for matters that significantly affect the member\'s own transactions.',
      },
      {
        no: '09',
        title: 'Application for Purchase of "Travel Products"',
        body:
          '① Users of "OHMYHOTEL & CO." shall apply for purchases on "OHMYHOTEL & CO." by the following or similar methods:\n1. Search and selection of "Travel Products"\n2. Entry of name, address, phone number, email address (or mobile phone number), etc.\n3. Confirmation of the terms and conditions of each product, products with limited subscription withdrawal rights, and matters related to the cost of other services\n4. Expression of agreement with these Terms and confirmation or rejection of the matters in Item 3 above (e.g., mouse click)\n5. Application for reservation of "Travel Products" and confirmation thereof, or consent to confirmation by "OHMYHOTEL & CO."\n6. Selection of payment method\n② Items such as pickup, extra bed, meals, meeting rooms, etc. added at the request of the customer during the reservation and payment stage are guaranteed in advance if prepaid, but other items are subject to the hotel\'s conditions at check-in.\n③ Some accommodations may not operate a 24-hour front desk without separate notice. Therefore, if you wish to check in late, please be sure to enter the relevant details in the customer request section during the reservation and payment stage. "OHMYHOTEL & CO." shall not be responsible for any problems arising from failure to do so.',
      },
      {
        no: '10',
        title: 'Formation of Contract',
        body:
          '① "OHMYHOTEL & CO." may not accept a purchase application as described in Article 9 if any of the following applies:\nHowever, when entering into a contract with a minor, a notice must be given that the minor or legal representative may cancel the contract if consent from the legal representative is not obtained.\n1. Cases of false information, omissions, or errors in the application contents\n2. Cases where a minor purchases goods and services prohibited under the Youth Protection Act\n3. Cases where accepting the purchase application is deemed to significantly hinder the "Company" technically\n② The contract shall be deemed established at the time when the deposit is received after "OHMYHOTEL & CO.\'s" acceptance reaches the user in the form of a receipt confirmation notification as per Article 12, Paragraph 1.\n③ "OHMYHOTEL & CO.\'s" expression of acceptance shall include confirmation of the user\'s purchase application, availability for sale, and information on correction or cancellation of the purchase application.\n④ When using a "Travel Product" after payment to "OHMYHOTEL & CO.," issuance of payment receipts is only available through "OHMYHOTEL & CO.\'s" website.',
      },
      {
        no: '11',
        title: 'Payment Methods',
        body:
          'Payment for "Travel Products" purchased from "OHMYHOTEL & CO." may be made by any of the following available methods. Direct payment to the hotel is possible only when a product with direct hotel payment conditions is selected.\n1. Real-time account transfer\n2. Various card payments including prepaid cards, debit cards, and credit cards',
      },
      {
        no: '12',
        title: 'Receipt Confirmation Notification, Change and Cancellation of Purchase Application',
        body:
          '① The cancellation policy of "OHMYHOTEL & CO." is based on the regulations and terms of the local hotel or professional supplier, and is notified to the member at the hotel reservation and payment stage. Reservation cannot proceed without agreement to the cancellation policy.\n② "OHMYHOTEL & CO." shall send a receipt confirmation notification to the user via email and mobile SMS when payment for the user\'s "Travel Product" purchase has been processed.\n③ If the user who received the receipt confirmation notification identifies any discrepancy in the expression of intent, the user may immediately request changes to or cancellation of the purchase or reservation application after receiving the receipt confirmation notification, and "OHMYHOTEL & CO." shall promptly process the request if it is made before the cancellation deadline specified for each product. However, changes and cancellations are not possible after the cancellation deadline. In such cases, OHMYHOTEL & CO. will actively mediate with the local accommodation to minimize the customer\'s damages but does not assume responsibility for the final penalty.\n④ Refunds shall be governed by the provisions on subscription withdrawal in Article 15.',
      },
      {
        no: '13',
        title: 'Provision of "Travel Product" Usage Rights',
        body:
          '① Unless otherwise notified for "Travel Products" provided by "OHMYHOTEL & CO.," once the user completes the reservation and payment, the usage rights for the "Travel Product" and separate terms applicable to the use of the product shall be provided through the website immediately, and all necessary arrangements shall be made for departure without any disruption.\n② "OHMYHOTEL & CO." shall compensate users for damages if it is unable to provide the usage rights for the "Travel Product" purchased by the user through the website due to "OHMYHOTEL & CO.\'s" circumstances. However, this shall not apply if "OHMYHOTEL & CO." proves the absence of intent or negligence.',
      },
      {
        no: '14',
        title: 'Refund',
        body:
          '① When a "Travel Product" purchased by the user is sold out and cannot be provided, "OHMYHOTEL & CO." shall promptly notify the user of the reason and refund the payment or take necessary measures for refund within 2 business days from the date the payment was received.\n② If the user terminates the contract after the reservation and payment for the "Travel Product" have been completed, a refund shall be made after deducting the prescribed penalty in accordance with the special terms agreed upon at the time of the service contract, the domestic (overseas) standard travel terms, and the domestic (overseas) consumer damage compensation regulations.\n③ If a double payment is made due to the fault of the local accommodation despite payment to "OHMYHOTEL & CO.," the amount charged by the accommodation shall be refunded.',
      },
      {
        no: '15',
        title: 'Subscription Withdrawal, etc.',
        body:
          '① A user who has entered into a contract for the purchase of a "Travel Product" with "OHMYHOTEL & CO." may receive a 100% refund and exercise the right of subscription withdrawal if there are 120 or more days remaining before the scheduled accommodation date or within the cancellation deadline. However, if the cancellation deadline has passed or the reservation was made under non-cancellable conditions, a separate cancellation fee may be charged in accordance with Article 674-3 of the Civil Act and the special terms.\n(Article 674-3 of the Civil Act (Cancellation of Contract Before Commencement of Travel): The traveler may cancel the contract at any time before the commencement of travel. However, the traveler shall compensate the other party for damages incurred.)\n② The user cannot cancel or exchange the product after the usage start date of the product has passed following completion of reservation and payment for the "Travel Product."\n③ If "OHMYHOTEL & CO." fails to clearly indicate at a place easily accessible to consumers that subscription withdrawal is restricted in situations described in Paragraph 2, the user\'s subscription withdrawal shall not be restricted.\n④ Notwithstanding the provisions of Paragraphs 1 and 2, the user may exercise subscription withdrawal within 3 months from the date of using the "Travel Product" or within 30 days from the date on which they became aware or could have become aware of the fact that the contents of the "Travel Product" differ from the advertised content or the contract terms.',
      },
      {
        no: '16',
        title: 'Effects of Subscription Withdrawal, etc.',
        body:
          '① "OHMYHOTEL & CO." shall process refunds in accordance with Article 14, and if the refund to the user is delayed, it shall pay delay interest calculated by multiplying the delay period by the delay interest rate determined and publicly announced by the Fair Trade Commission.\n② When refunding the payment, if the user paid for the "Travel Product" by credit card or electronic currency, "OHMYHOTEL & CO." shall immediately request the payment method provider to suspend or cancel the billing for the "Travel Product."\n③ In the case of subscription withdrawal, the cost for cancellation of the "Travel Product" reservation shall be borne by the user. "OHMYHOTEL & CO." shall not charge any penalty or claim damages from the user for subscription withdrawal to the extent that it does not violate the provisions of the special terms for each product. However, if the contents of the product differ from the advertised content or the contract terms and subscription withdrawal is made, the cost for cancellation of the "Travel Product" reservation shall be borne by "OHMYHOTEL & CO."',
      },
      {
        no: '17',
        title: 'Provision of "Member" Services',
        body:
          '① "OHMYHOTEL & CO." shall do its best to provide products or services continuously and stably as prescribed by these Terms.\n② "OHMYHOTEL & CO." shall process inquiries, requests, and other complaints deemed legitimate that are raised by "Members" in relation to service usage.',
      },
      {
        no: '18',
        title: 'Protection of Personal Information',
        body:
          '① "OHMYHOTEL & CO." shall endeavor to protect the personal information of "Members" in accordance with the relevant laws and regulations, including the "Information and Communications Network Act." The protection and use of personal information shall be governed by the relevant laws and "OHMYHOTEL & CO.\'s" Privacy Policy. However, "OHMYHOTEL & CO.\'s" Privacy Policy shall not apply to linked sites other than "OHMYHOTEL & CO.\'s" official site.\n② "OHMYHOTEL & CO." shall not use the personal information provided by users for purposes other than those specified in these Terms without the user\'s consent, nor provide it to third parties beyond the scope of member service performance.',
      },
      {
        no: '19',
        title: 'Information Transmission and Provision',
        body:
          '① "OHMYHOTEL & CO." may provide "Members" with various information deemed necessary during the use of "Services" through notices or email. However, "Members" may refuse to receive emails at any time, except for transaction-related information required by law and responses to customer inquiries.\n② When intending to transmit the information in Paragraph 1 by telephone or facsimile, it shall be transmitted with the prior consent of the "Member." However, exceptions apply to the "Member\'s" transaction-related information, mandatory notices, and responses to customer inquiries.',
      },
      {
        no: '20',
        title: 'Obligations of "OHMYHOTEL & CO."',
        body:
          '① "OHMYHOTEL & CO." shall not engage in acts prohibited by laws or these Terms or acts contrary to public order and morals, and shall do its best to provide "Travel Products" continuously and stably as prescribed by these Terms.\n② "OHMYHOTEL & CO." shall have a security system in place to protect users\' personal information (including credit information) so that users can use internet services safely.\n③ "OHMYHOTEL & CO." shall be liable to compensate for damages suffered by users due to unfair display and advertising acts under Article 3 of the "Act on Fair Labeling and Advertising" with respect to "Travel Products."\n④ "OHMYHOTEL & CO." shall not send commercial advertising emails that the user does not wish to receive.',
      },
      {
        no: '21',
        title: "Member's Obligations Regarding ID and Password",
        body:
          '① Except as provided in Article 17, the responsibility for managing the ID and password lies with the member.\n② A member shall not allow a third party to use their ID and password.\n③ If a member becomes aware that their ID and password have been stolen or are being used by a third party, they shall immediately notify "OHMYHOTEL & CO." and follow the guidance provided by "OHMYHOTEL & CO."',
      },
      {
        no: '22',
        title: "User's Obligations",
        body:
          'Users shall not engage in the following acts:\n1. Registration of false information when applying or making changes\n2. Stealing another person\'s information\n3. Altering information posted on "OHMYHOTEL & CO."\n4. Transmitting or posting information (computer programs, etc.) other than the information designated by "OHMYHOTEL & CO."\n5. Infringement of intellectual property rights such as copyrights of "OHMYHOTEL & CO." or third parties\n6. Acts that damage the reputation of "OHMYHOTEL & CO." or third parties or interfere with their business\n7. Acts of disclosing or posting obscene or violent messages, images, voices, or other information contrary to public order and morals on the online shopping mall',
      },
      {
        no: '23',
        title: 'Attribution of Copyright and Restrictions on Use',
        body:
          '① Copyright and other intellectual property rights for works created by "OHMYHOTEL & CO." shall belong to "OHMYHOTEL & CO."\n② Users shall not reproduce, transmit, publish, distribute, broadcast, or otherwise commercially use, or allow third parties to use, information to which "OHMYHOTEL & CO.\'s" intellectual property rights are attributed, obtained through the use of "OHMYHOTEL & CO.," without the prior consent of "OHMYHOTEL & CO."\n③ "OHMYHOTEL & CO." shall notify the relevant user when using copyright attributed to the user in accordance with the agreement.\n④ Any damages arising from the user\'s use of information posted on "OHMYHOTEL & CO." without entering into a "Travel Product" usage contract with "OHMYHOTEL & CO." shall be entirely the user\'s responsibility.',
      },
      {
        no: '24',
        title: 'Dispute Resolution',
        body:
          '① "OHMYHOTEL & CO." shall establish and operate a damage compensation processing organization to reflect legitimate opinions or complaints raised by users and compensate for their damages.\n② "OHMYHOTEL & CO." shall prioritize the processing of complaints and opinions submitted by users. However, if prompt processing is difficult, the reason and processing schedule shall be immediately notified to the user.\n③ In the event that a user files an application for damage relief regarding an electronic commerce dispute between "OHMYHOTEL & CO." and the user, the matter may be subject to mediation by the dispute mediation body commissioned by the Fair Trade Commission or the city/provincial governor.',
      },
      {
        no: '25',
        title: 'Jurisdiction and Governing Law',
        body:
          '① Lawsuits regarding electronic commerce disputes between "OHMYHOTEL & CO." and users shall be filed based on the user\'s address at the time of filing, or in the absence of an address, the district court with exclusive jurisdiction over the user\'s residence. However, if the user\'s address or residence is unclear at the time of filing or the user is a foreign resident, the lawsuit shall be filed with the court of jurisdiction under the Civil Procedure Act.\n② Korean law shall apply to electronic commerce lawsuits filed between the "Company" and users. However, matters to which the laws of the Company\'s headquarters jurisdiction (Singapore law) may apply shall be determined separately.',
      },
      {
        no: '26',
        title: 'Special Provisions',
        body:
          '① Matters not specified in these Terms shall be governed by the Framework Act on Electronic Transactions, the Electronic Signatures Act, the Act on the Consumer Protection in Electronic Commerce, etc., and other relevant laws and regulations, as well as the domestic and international standard travel terms.\n② "OHMYHOTEL & CO." only acts as an agent for reservation services through contracts with accommodation establishments and hotel suppliers. Therefore, please refer to the individual terms of the relevant "Travel Product" provided in the detailed product information for specific reservation conditions and regulations before proceeding with reservation and payment.',
      },
      {
        title: 'Supplementary Provisions',
        body: 'These Terms shall be effective from March 14, 2026.',
      },
    ],
    footnote: '© OHMYHOTEL GLOBAL PTE. LTD. — Effective from March 14, 2026.',
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    company: 'OHMYHOTEL GLOBAL PTE. LTD.',
    sections: [
      { title: 'Company Information', table: COMPANY_TABLE },
      {
        title: 'Entrustment of Personal Information Processing and Customer Center Operation',
        body: 'The Company entrusts the processing of personal information and the operation of the customer center to the following Korean corporation.',
        table: KR_ENTRUST_TABLE,
      },
      {
        no: '01',
        title: 'Consent to Collection of Personal Information',
        body:
          'The Company manages online/offline personal information collection in a unified manner due to the nature of the travel business to facilitate smooth consultations. This means that personal information provided when registering on the website is also utilized for offline consultations. The Company provides a procedure for users to click an "Agree" button or a "Cancel" button regarding the contents of the Company\'s Privacy Policy or Terms of Use when registering on the website, and clicking the "Agree" button shall be deemed consent to the collection of personal information. When personal information is obtained via telephone or offline, the Company verbally informs the individual of the acquisition of their personal information and guides them to verify it through the website.',
      },
      {
        no: '02',
        title: 'Purpose of Collection and Use of Personal Information',
        body:
          'The Company uses the collected personal information for the following purposes:\n\nI. Performance of contracts related to service provision and fee settlement for service provision\nTravel product (hotel) reservations, confirmation and consultation of reservation details, content provision, preferential treatment for members using travel services, accumulation, inquiry, use, and guidance on points, purchase and payment of fees, delivery of goods or billing statements, financial services, etc.\n\nII. Member management\nPrevention of unauthorized use by delinquent members and unauthorized access for the use of membership services, verification of intent to register, record preservation for dispute resolution, complaint handling, delivery of notices, etc.\n\nIII. Utilization for marketing and advertising\nDevelopment and specialization of new services, provision of services and advertisements according to demographic characteristics, product information from the Company and affiliated companies, event advertising and promotional information delivery, statistics on members\' service usage, various marketing activities targeting members.\n\nThe Company collects the following personal information for travel service provision and membership registration.\n\n[Member Information]\nRequired: Travel agency name, business address, name, login ID, password, email, phone number, mobile phone number, commission deposit account bank name, commission deposit account number, commission deposit account holder name\nOptional: Company logo, fax number\nPurpose: Identification of users and product consultation, confirmation of reservation details and communication for contract fulfillment, notification of major changes in terms and conditions, record preservation for dispute resolution, complaint handling, and other marketing and advertising utilization\n\n[Hotel Reservation and Consultation]\nBooker: Name, contact information (email/mobile), other details · Traveler: Name (Korean/English)\nPurpose: Verification of hotel reservation and departure eligibility\n\n[Payment and Settlement]\nName, card company name, credit card number, authorization number, account number, contact information (email/mobile), amount\nPurpose: Credit card payment services and bank payment via account transfer\n\n[System Related]\nName, card company name, credit card number, authorization number, account number, contact information (email/mobile), amount\nPurpose: Member service usage statistics\n\n[Methods of Personal Information Collection]\nMembership registration through website, written forms, telephone, fax, email, bulletin boards, customer suggestions, various bulletin boards operated by the Company, prize event entries, etc.',
      },
      {
        no: '03',
        title: 'Retention and Usage Period of Personal Information',
        body:
          'In principle, personal information collected with the user\'s consent is retained and used while the user uses the services on the Company\'s website. The Company will promptly destroy collected personal information when the purpose of collection and use has been achieved, as described below.\nHowever, the following information shall be retained for the periods stated below for the reasons specified.\n\nI. Retained Items\nName (Korean/English), login ID, password, gender, contact information (email/mobile), mailing address (company) and phone/fax number, company name, department name, position, company address and phone number (fax number)\n\nII. Basis and Period of Retention\n① Member registration information: Until a withdrawal request is made or membership is lost\n② Information collected for temporary purposes such as surveys and events: Until the completion of such surveys, events, etc.\n③ When the Company ceases business operations\n④ As determined by other relevant laws and regulations\n\nHowever, even after the purpose of collection and use of personal information has been achieved, personal information may be retained in accordance with the provisions of the Commercial Act, the Act on the Consumer Protection in Electronic Commerce, etc., where there is a need to preserve it, or where the retention period has been notified to or specified to the user in advance.\n- Records related to contracts or withdrawal of offers: 5 years (Act on the Consumer Protection in Electronic Commerce, etc.)\n- Records related to payment and supply of goods: 5 years (Act on the Consumer Protection in Electronic Commerce, etc.)\n- Records related to consumer complaints or dispute resolution: 3 years (Act on the Consumer Protection in Electronic Commerce, etc.)\n- Records related to collection/processing and use of credit information: 3 years (Credit Information Use and Protection Act)\n- Records related to identity verification: 6 months (Act on Promotion of Information and Communications Network Utilization and Information Protection, etc.)\n- Records related to website visits: 3 months (Protection of Communications Secrets Act)',
      },
      {
        no: '04',
        title: 'Procedures and Methods for Destruction of Personal Information',
        body:
          'In principle, the Company promptly destroys personal information after the purpose of its collection and use has been achieved. The procedures and methods of destruction are as follows:\n\nI. Destruction Procedure\nInformation entered by members for membership registration, etc. is transferred to a separate database (or a separate document file for paper documents) after the purpose has been achieved and is destroyed after being stored for a certain period in accordance with internal policies and information protection reasons under other relevant laws (refer to the retention and usage period).\nPersonal information transferred to a separate database will not be used for purposes other than holding it, unless required by law.\n\nII. Destruction Method\nUnless required by law, personal information transferred to a separate database will not be used for purposes other than holding it. For credit card information, it is managed in an encrypted form until the time of payment and is permanently deleted immediately upon payment and cancellation.',
      },
      {
        no: '05',
        title: 'Rights of Users and Legal Representatives and Methods of Exercise',
        body:
          "Users and legal representatives may view or modify their registered personal information at any time and may also request membership withdrawal. To view and modify personal information of users or children under 14 years of age, click on 'Change Personal Information' (or 'Modify Member Information,' etc.), and for membership withdrawal (withdrawal of consent), click on 'Withdraw Membership,' complete the identity verification process, and directly view, correct, or withdraw.\nAlternatively, if you contact the Personal Information Manager in writing, by phone, or by email, we will take action without delay.\nIf you request correction of errors in your personal information, the Company will not use or provide such personal information until the correction is completed. In addition, if incorrect personal information has already been provided to a third party, the correction results will be promptly notified to the third party to ensure correction.\nOHMYHOTEL & CO., LTD. processes personal information withdrawn or deleted at the request of users or legal representatives in accordance with the provisions stated in 'Retention and Usage Period of Personal Information Collected by OHMYHOTEL & CO., LTD.' and ensures that it cannot be viewed or used for any other purpose.",
      },
      {
        no: '06',
        title: 'Matters Regarding Installation, Operation, and Refusal of Automatic Personal Information Collection Devices',
        body:
          "The Company operates 'cookies' and other tools to store and retrieve your information periodically. Cookies are very small text files sent by the server operating OHMYHOTEL & CO., LTD.'s website to your browser and stored on your computer's hard disk. The Company uses cookies for the following purposes:\n\nI. Purpose of Using Cookies, etc.\nTo analyze the access frequency and visit times of members and non-members, identify user preferences and areas of interest and track their activities, and conduct targeted marketing and personalized services through analysis of participation levels in various events and visit frequency.\nYou have the option to accept or refuse the installation of cookies. Therefore, you can allow all cookies, require confirmation each time a cookie is stored, or refuse storage of all cookies by setting the options in your web browser.\n\nII. How to Refuse Cookie Settings\nExample: You may allow all cookies, require confirmation each time a cookie is stored, or refuse storage of all cookies by selecting the options in your web browser.\nSetting method example (for Internet Explorer): Tools at the top of the web browser > Internet Options > Privacy\nHowever, if you refuse cookie installation, there may be difficulties in providing services.",
      },
      {
        no: '09',
        title: 'Technical/Administrative Protective Measures for Personal Information',
        body:
          "Members' personal information is protected by passwords and personal authentication keys. However, although the Company encrypts and protects your passwords and authentication keys, there is a possibility that they may be unintentionally lost, stolen, or leaked to others during processes such as internet use in public places. Therefore, members must not disclose, lease, or provide their personal information to others, and must responsibly manage their personal information against unauthorized collection through social engineering methods such as phishing. The Company assumes no responsibility for the loss, theft, leakage, phishing, or disclosure of such passwords or authentication keys. Your personal information is fundamentally protected by passwords and authentication keys, and important data is protected through separate security functions by encrypting files and transmitted data.\n\nI. Technical Measures\nThe Company makes its best efforts to prevent the leakage or damage of members' personal information due to hacking or computer viruses.\n- Data backup to prepare for damage to personal information\n- Regular updates of the latest antivirus programs\n- Adoption of security devices (SSL) to safely transmit personal information over the network using encryption algorithms\n- Control of unauthorized access from outside using intrusion prevention systems\n- Efforts to establish all possible technical measures to ensure system security\n\nII. Administrative Measures\nThe Company limits the personnel handling personal information to designated staff only, which includes:\n- Persons who perform marketing duties directly with users\n- Personal information management officers and staff who perform personal information management duties\n- Other persons for whom handling personal information is unavoidable in the course of their duties\n\nAdministrative measures for the above staff are as follows:\n- Assignment of separate login IDs and passwords\n- Regular training on personal information protection obligations and security for staff in charge to ensure compliance with the privacy policy\n- Obtaining security pledge agreements from all employees upon hiring to prevent information leaks by individuals, and establishing internal procedures to audit implementation of the privacy policy and employee compliance\n- Designation and management of computer rooms and data storage rooms as special protection areas\n\nThe Company also verifies the implementation of the privacy policy and compliance by designated staff through the internal Personal Information Officer, and makes efforts to immediately correct and rectify any issues found.\nHowever, the Company assumes no responsibility for problems arising from the leakage of personal information such as ID, password, or resident registration number due to the user's own negligence or internet-related issues.\nIn the event of loss, leakage, alteration, or damage of personal information due to internal administrator errors or technical management accidents, the Company will immediately notify you and take appropriate measures and compensation.",
      },
      {
        no: '07',
        title: 'Contact Information of Personal Information Manager and Staff',
        body:
          "You may report all complaints related to personal information protection arising from the use of the Company's services to the Personal Information Manager or the relevant department. The Company will provide prompt and sufficient responses to user reports.",
      },
      {
        no: '08',
        title: 'Obligation of Notification',
        body:
          'Any additions, deletions, or modifications to the current Privacy Policy will be notified through the notice section on the website. The information posted on this site may contain errors or delays, and the responsibility for using such information lies with the user. In addition, users may not reproduce or copy this information without authorization.',
      },
    ],
    footnote: '© OHMYHOTEL GLOBAL PTE. LTD. — Personal Information Manager: Choi Younggeun (+82-2-762-0552)',
  },
};
