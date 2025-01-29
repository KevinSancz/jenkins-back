pipeline {
    agent any

    environment {
        OCI_REGISTRY  = 'iad.ocir.io'
        OCI_NAMESPACE = 'idxyojfomq6q'
        BACK_IMAGE_NAME = 'backend'
        FRONT_IMAGE_NAME = 'frontend'
        KUBECONFIG    = '/home/opc/.kube/config'
        REPO_URL      = 'https://github.com/KevinSancz/jenkins-back.git'
        CLUSTER_ID    = 'ocid1.cluster.oc1.iad.aaaaaaaaq4k6vopup3yyac3776sfrbr47jm2qp5j7db2upvmdcbwqn2rc55q'
    }

    stages {
        stage('Checkout Repo') {
            steps {
                checkout([ 
                    $class: 'GitSCM', 
                    branches: [[name: 'master']],
                    extensions: [],
                    userRemoteConfigs: [[url: "${REPO_URL}"]]
                ])
            }
        }

        stage('Build & Push Images') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('Back') {
                            script {
                                docker.build("${OCI_REGISTRY}/${OCI_NAMESPACE}/${BACK_IMAGE_NAME}:${BUILD_NUMBER}")
                                docker.withRegistry("https://${OCI_REGISTRY}", '15050001') {
                                    docker.image("${OCI_REGISTRY}/${OCI_NAMESPACE}/${BACK_IMAGE_NAME}:${BUILD_NUMBER}").push()
                                    docker.image("${OCI_REGISTRY}/${OCI_NAMESPACE}/${BACK_IMAGE_NAME}:latest").push()
                                }
                            }
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        dir('Front') {
                            script {
                                docker.build("${OCI_REGISTRY}/${OCI_NAMESPACE}/${FRONT_IMAGE_NAME}:${BUILD_NUMBER}")
                                docker.withRegistry("https://${OCI_REGISTRY}", '15050001') {
                                    docker.image("${OCI_REGISTRY}/${OCI_NAMESPACE}/${FRONT_IMAGE_NAME}:${BUILD_NUMBER}").push()
                                    docker.image("${OCI_REGISTRY}/${OCI_NAMESPACE}/${FRONT_IMAGE_NAME}:latest").push()
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy to OKE') {
            steps {
                script {
                    // Reemplazar placeholder en los manifests
                    sh """
                        sed -i 's/BUILD_NUMBER_PLACEHOLDER/${BUILD_NUMBER}/g' k8s/backend-deployment.yaml
                        sed -i 's/BUILD_NUMBER_PLACEHOLDER/${BUILD_NUMBER}/g' k8s/frontend-deployment.yaml
                    """

                    // Aplicar los manifests
                    sh """
                        kubectl apply -f k8s/backend-deployment.yaml
                        kubectl apply -f k8s/frontend-deployment.yaml
                    """
                }
            }
        }
    }

    post {
        always {
            sh 'docker system prune -af' // Limpieza de imágenes
        }
    }
}